import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Invoice, InvoiceStatus, PayInvoicePayload, Transaction } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { findCardById } from '@/hooks/useCards';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { parseLocalDate } from '@/lib/date';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['invoices'];
const invoicesCacheByScope = new Map<string, Invoice[]>();

function getScopedInvoices(scope: string): Invoice[] {
  return invoicesCacheByScope.get(scope) ?? [];
}

function mapInvoiceRow(row: Tables<'invoices'>): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    cardId: row.card_id,
    month: row.month,
    year: row.year,
    openingDate: row.opening_date,
    dueDate: row.due_date,
    closingBalance: Number(row.closing_balance || 0),
    minimumPayment: Number(row.minimum_payment || 0),
    status: row.status as InvoiceStatus,
    paidAmount: Number(row.paid_amount || 0),
    transactions: [],
    card: findCardById(row.card_id),
  };
}

function hydrateInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    card: findCardById(invoice.cardId),
    status: invoice.status,
  };
}

function sortInvoices(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export function getInvoicesSnapshot(): Invoice[] {
  const scope = getScopeKey(getActiveUserId());
  return [...getScopedInvoices(scope)];
}

export function useInvoices(cardId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, cardId],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      let query = supabase.from('invoices').select('*').order('year', { ascending: false }).order('month', { ascending: false });
      if (cardId) query = query.eq('card_id', cardId);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(mapInvoiceRow).map(hydrateInvoice);
      const sorted = sortInvoices(mapped);
      invoicesCacheByScope.set(scope, sorted);
      return sorted;
    },
    staleTime: 20_000,
  });
}

export function useCurrentInvoice(cardId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, 'current', cardId],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      let query = supabase.from('invoices').select('*').order('year', { ascending: false }).order('month', { ascending: false });
      if (cardId) query = query.eq('card_id', cardId);

      const { data, error } = await query;
      if (error) throw error;

      const invoices = sortInvoices((data || []).map(mapInvoiceRow).map(hydrateInvoice));
      invoicesCacheByScope.set(scope, invoices);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const activeInvoices = invoices.filter((invoice) => invoice.status !== 'PAGA');
      const currentOrPastActive = activeInvoices.filter(
        (invoice) =>
          invoice.year < currentYear || (invoice.year === currentYear && invoice.month <= currentMonth),
      );

      return currentOrPastActive[0] || activeInvoices[0] || invoices[0] || null;
    },
    staleTime: 20_000,
  });
}

export function useInvoice(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = hydrateInvoice(mapInvoiceRow(data));
      invoicesCacheByScope.set(
        scope,
        getScopedInvoices(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PayInvoicePayload }) => {
      const payload = {
        p_invoice_id: id,
        p_account_id: data.accountId,
        p_amount: Number(data.amount),
        p_payment_date: data.date || null,
      };

      const { data: response, error } = await supabase.rpc('pay_invoice', payload);
      if (error) throw error;

      const row = Array.isArray(response) ? response[0] : response;
      if (!row) throw new Error('No invoice returned by pay_invoice');

      const updatedInvoice: Invoice = hydrateInvoice({
        id: row.id,
        userId: row.user_id,
        cardId: row.card_id,
        month: row.month,
        year: row.year,
        openingDate: row.opening_date,
        dueDate: row.due_date,
        closingBalance: Number(row.closing_balance || 0),
        minimumPayment: Number(row.minimum_payment || 0),
        status: row.status as InvoiceStatus,
        paidAmount: Number(row.paid_amount || 0),
        transactions: [],
      });

      const scope = getScopeKey(user?.id);
      invoicesCacheByScope.set(
        scope,
        getScopedInvoices(scope).map((item) => (item.id === updatedInvoice.id ? updatedInvoice : item)),
      );

      return { invoice: updatedInvoice, transaction: null as unknown as Transaction };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const remaining = response.invoice.closingBalance - response.invoice.paidAmount;
      toast({
        title: remaining <= 0 ? 'Fatura quitada!' : 'Pagamento registrado!',
        description: remaining > 0 ? `Ainda restam ${formatCurrency(remaining)} para quitar.` : 'Sua fatura foi paga completamente.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao pagar fatura',
        description: 'Nao foi possivel registrar o pagamento. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function getInvoiceStatus(invoice: Invoice): { status: InvoiceStatus; color: string; message: string } {
  const status = invoice.status;
  if (status === 'PAGA') return { status: 'PAGA', color: '#10B981', message: 'Fatura quitada' };
  if (status === 'PARCIALMENTE_PAGA') return { status: 'PARCIALMENTE_PAGA', color: '#F59E0B', message: 'Pagamento parcial' };
  if (status === 'ATRASADA') return { status: 'ATRASADA', color: '#EF4444', message: 'Fatura atrasada!' };
  return { status: 'ABERTA', color: '#3B82F6', message: 'Aberta para pagamento' };
}

export function getInvoiceProgress(invoice: Invoice): number {
  if (invoice.closingBalance === 0) return 100;
  return (invoice.paidAmount / invoice.closingBalance) * 100;
}

export function getDaysUntilDue(invoice: Invoice): number {
  const today = new Date();
  const dueDate = parseLocalDate(invoice.dueDate);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatInvoiceMonth(month: number, year: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[month - 1]}/${year}`;
}
