import { addMonths, format as formatDate } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PaginatedResponse,
  Transaction,
  TransactionFilters,
  TransactionOrigin,
  TransactionStatus,
  TransactionTag,
  TransactionType,
} from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { findCategoryById } from '@/hooks/useCategories';
import { parseLocalDate } from '@/lib/date';
import {
  applyTransactionContractFilters,
  splitAmountIntoInstallments,
} from '@/lib/financialDomain';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['transactions'];
const transactionsCacheByScope = new Map<string, Transaction[]>();
const QUERY_BATCH_SIZE = 1000;
const TAGS_BATCH_SIZE = 500;

function getScopedTransactions(scope: string): Transaction[] {
  return transactionsCacheByScope.get(scope) ?? [];
}

type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  transferToAccountId?: string;
  installments?: number;
};

type UpdateTransactionInput = {
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string | null;
  accountId?: string | null;
  cardId?: string | null;
  transferToAccountId?: string | null;
};

function todayYmd(): string {
  return formatDate(new Date(), 'yyyy-MM-dd');
}

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function fallbackUuidV4(): string {
  const randomHex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`;
}

function generateSeriesId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackUuidV4();
}

function mapTransactionRow(row: Tables<'transactions'>): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id || undefined,
    cardId: row.card_id || undefined,
    invoiceId: row.invoice_id || undefined,
    categoryId: row.category_id || undefined,
    recurrenceId: row.recurrence_id || undefined,
    type: row.type as TransactionType,
    amount: Number(row.amount || 0),
    description: row.description,
    date: row.date,
    status: row.status as TransactionStatus,
    origin: row.origin as TransactionOrigin,
    isPending: row.is_pending,
    isRecurring: row.is_recurring,
    installmentNumber: row.installment_number || undefined,
    totalInstallments: row.total_installments || undefined,
    installmentSeriesId: row.installment_series_id || undefined,
    note: row.note || undefined,
    transferToAccountId: row.transfer_to_account_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: findCategoryById(row.category_id || undefined),
    tags: [],
  };
}

function mergeTransactionsInCache(items: Transaction[], scope: string) {
  const byId = new Map(getScopedTransactions(scope).map((item) => [item.id, item]));
  items.forEach((item) => byId.set(item.id, item));
  transactionsCacheByScope.set(
    scope,
    [...byId.values()].sort(
      (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
    ),
  );
}

function normalizeCategoryId(categoryId?: string): string | null {
  if (!categoryId) return null;
  if (isUuid(categoryId)) return categoryId;
  return null;
}

function normalizeSortBy(sortBy?: TransactionFilters['sortBy']): 'date' | 'amount' | 'createdAt' {
  if (sortBy === 'amount' || sortBy === 'createdAt') return sortBy;
  return 'date';
}

function normalizeSortOrder(sortOrder?: TransactionFilters['sortOrder']): 'asc' | 'desc' {
  return sortOrder === 'asc' ? 'asc' : 'desc';
}

function applyClientFilters(data: Transaction[], filters?: TransactionFilters): Transaction[] {
  let filtered = [...data];

  if (!filters?.status) {
    filtered = filtered.filter((item) => item.status !== 'CANCELADA');
  }

  if (filters?.accountId) filtered = filtered.filter((item) => item.accountId === filters.accountId);
  if (filters?.cardId) filtered = filtered.filter((item) => item.cardId === filters.cardId);
  if (filters?.categoryId) filtered = filtered.filter((item) => item.categoryId === filters.categoryId);
  if (filters?.type) filtered = filtered.filter((item) => item.type === filters.type);
  if (filters?.status) filtered = filtered.filter((item) => item.status === filters.status);
  if (filters?.startDate) filtered = filtered.filter((item) => item.date >= filters.startDate);
  if (filters?.endDate) filtered = filtered.filter((item) => item.date <= filters.endDate);

  return applyTransactionContractFilters(filtered, {
    minAmount: filters?.minAmount,
    maxAmount: filters?.maxAmount,
    tag: filters?.tag,
    sortBy: normalizeSortBy(filters?.sortBy),
    sortOrder: normalizeSortOrder(filters?.sortOrder),
    page: filters?.page,
    limit: filters?.limit,
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

type RawTransactionTagRow = {
  transaction_id: string;
  tag_id: string;
  tags:
    | {
        id: string;
        name: string;
        color: string | null;
      }
    | Array<{
        id: string;
        name: string;
        color: string | null;
      }>
    | null;
};

function toTransactionTag(row: RawTransactionTagRow): TransactionTag | null {
  const related = Array.isArray(row.tags) ? row.tags[0] : row.tags;
  if (!related?.id || !related.name) return null;

  return {
    id: `${row.transaction_id}:${related.id}`,
    tag: {
      id: related.id,
      name: related.name,
      color: related.color || undefined,
    },
  };
}

async function loadTransactionTagsMap(transactionIds: string[]): Promise<Map<string, TransactionTag[]>> {
  const map = new Map<string, TransactionTag[]>();
  if (!transactionIds.length) return map;

  const chunks = chunkArray(transactionIds, TAGS_BATCH_SIZE);

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('transaction_tags')
      .select('transaction_id, tag_id, tags(id, name, color)')
      .in('transaction_id', chunk);

    if (error) throw error;

    ((data || []) as RawTransactionTagRow[]).forEach((row) => {
      const mapped = toTransactionTag(row);
      if (!mapped) return;
      const current = map.get(row.transaction_id) || [];
      current.push(mapped);
      map.set(row.transaction_id, current);
    });
  }

  return map;
}

async function hydrateTransactionRows(rows: Tables<'transactions'>[]): Promise<Transaction[]> {
  const mapped = rows.map(mapTransactionRow);
  const tagMap = await loadTransactionTagsMap(mapped.map((item) => item.id));

  return mapped.map((item) => ({
    ...item,
    tags: tagMap.get(item.id) || [],
  }));
}

async function resolveTagFilterTransactionIds(tagFilter?: string): Promise<string[] | null> {
  if (!tagFilter?.trim()) return null;

  const normalized = tagFilter.trim();

  let tagIds: string[] = [];
  if (isUuid(normalized)) {
    tagIds = [normalized];
  } else {
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', `%${normalized}%`)
      .limit(100);

    if (tagsError) throw tagsError;
    tagIds = (tags || []).map((item) => item.id);
  }

  if (!tagIds.length) return [];

  const { data: rows, error: mapError } = await supabase
    .from('transaction_tags')
    .select('transaction_id')
    .in('tag_id', tagIds);

  if (mapError) throw mapError;

  return Array.from(new Set((rows || []).map((item) => item.transaction_id)));
}

function buildUpdatePayload(data: UpdateTransactionInput): Tables<'transactions'>['Update'] {
  const payload: Tables<'transactions'>['Update'] = {
    amount: data.amount !== undefined ? Number(data.amount) : undefined,
    description: data.description,
    date: data.date,
    category_id:
      data.categoryId !== undefined
        ? normalizeCategoryId(data.categoryId || undefined)
        : undefined,
    account_id: data.accountId !== undefined ? data.accountId : undefined,
    card_id: data.cardId !== undefined ? data.cardId : undefined,
    transfer_to_account_id:
      data.transferToAccountId !== undefined ? data.transferToAccountId : undefined,
  };

  if (payload.amount !== undefined && (!Number.isFinite(payload.amount) || payload.amount <= 0)) {
    throw new Error('Invalid amount');
  }

  return payload;
}

async function resolveSeriesId(transactionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, installment_series_id, total_installments')
    .eq('id', transactionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Transaction not found');
  if (!data.installment_series_id || !data.total_installments || data.total_installments <= 1) {
    return null;
  }

  return data.installment_series_id;
}

export function getTransactionsSnapshot(filters?: TransactionFilters): Transaction[] {
  const scope = getScopeKey(getActiveUserId());
  return applyClientFilters(getScopedTransactions(scope), filters);
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, filters],
    enabled: !!user?.id,
    queryFn: async (): Promise<PaginatedResponse<Transaction>> => {
      const scope = getScopeKey(user?.id);
      const page = Math.max(1, filters?.page || 1);
      const hasExplicitLimit = typeof filters?.limit === 'number' && (filters?.limit || 0) > 0;
      const limit = hasExplicitLimit ? Math.max(1, filters?.limit || 1) : null;

      const tagFilteredTransactionIds = await resolveTagFilterTransactionIds(filters?.tag);
      if (tagFilteredTransactionIds && !tagFilteredTransactionIds.length) {
        return {
          data: [],
          pagination: {
            page,
            limit: limit || 1,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const sortBy = normalizeSortBy(filters?.sortBy);
      const sortOrder = normalizeSortOrder(filters?.sortOrder);
      const sortColumn = sortBy === 'amount' ? 'amount' : sortBy === 'createdAt' ? 'created_at' : 'date';
      const ascending = sortOrder === 'asc';

      const applyQueryFilters = (query) => {
        let working = query;

        if (filters?.accountId) working = working.eq('account_id', filters.accountId);
        if (filters?.cardId) working = working.eq('card_id', filters.cardId);
        if (filters?.categoryId) working = working.eq('category_id', filters.categoryId);
        if (filters?.type) working = working.eq('type', filters.type);
        if (filters?.status) {
          working = working.eq('status', filters.status);
        } else {
          working = working.neq('status', 'CANCELADA');
        }
        if (filters?.startDate) working = working.gte('date', filters.startDate);
        if (filters?.endDate) working = working.lte('date', filters.endDate);
        if (typeof filters?.minAmount === 'number') working = working.gte('amount', filters.minAmount);
        if (typeof filters?.maxAmount === 'number') working = working.lte('amount', filters.maxAmount);
        if (tagFilteredTransactionIds) working = working.in('id', tagFilteredTransactionIds);

        working = working.order(sortColumn, { ascending });
        if (sortColumn !== 'created_at') {
          working = working.order('created_at', { ascending });
        }

        return working;
      };

      if (limit !== null) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const query = applyQueryFilters(
          supabase.from('transactions').select('*', { count: 'exact' }).range(from, to),
        );

        const { data, error, count } = await query;
        if (error) throw error;

        const mapped = await hydrateTransactionRows((data || []) as Tables<'transactions'>[]);
        mergeTransactionsInCache(mapped, scope);

        const total = Number(count || 0);
        return {
          data: mapped,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        };
      }

      const allRows: Tables<'transactions'>[] = [];
      let from = 0;

      while (true) {
        const to = from + QUERY_BATCH_SIZE - 1;
        const query = applyQueryFilters(supabase.from('transactions').select('*').range(from, to));
        const { data, error } = await query;
        if (error) throw error;

        const chunk = ((data || []) as Tables<'transactions'>[]).filter(Boolean);
        allRows.push(...chunk);

        if (chunk.length < QUERY_BATCH_SIZE) break;
        from += QUERY_BATCH_SIZE;
      }

      const mapped = await hydrateTransactionRows(allRows);
      mergeTransactionsInCache(mapped, scope);

      return {
        data: mapped,
        pagination: {
          page: 1,
          limit: Math.max(1, mapped.length),
          total: mapped.length,
          totalPages: 1,
        },
      };
    },
    staleTime: 20_000,
  });
}

export function useTransaction(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const [mapped] = await hydrateTransactionRows([data]);
      mergeTransactionsInCache([mapped], scope);
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useTransactionSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, 'summary'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('status', 'EFETIVADA')
        .eq('is_pending', false);
      if (error) throw error;

      const totalIncome = (data || [])
        .filter((item) => item.type === 'RECEITA')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const totalExpense = (data || [])
        .filter((item) => item.type === 'DESPESA')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
      };
    },
    staleTime: 20_000,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }

      const baseDate = data.date || todayYmd();
      const categoryId = normalizeCategoryId(data.categoryId);

      if (data.type === 'TRANSFERENCIA') {
        if (!data.accountId || !data.transferToAccountId) throw new Error('Transfer accounts are required');

        const payload: Tables<'transactions'>['Insert'] = {
          user_id: user.id,
          type: 'TRANSFERENCIA',
          amount,
          description: data.description,
          date: baseDate,
          account_id: data.accountId,
          transfer_to_account_id: data.transferToAccountId,
          category_id: categoryId,
          status: 'EFETIVADA',
          origin: 'TRANSFERENCIA',
          is_pending: false,
          is_recurring: false,
        };

        const { data: inserted, error } = await supabase.from('transactions').insert(payload).select('*').single();
        if (error) throw error;

        const [mapped] = await hydrateTransactionRows([inserted]);
        mergeTransactionsInCache([mapped], getScopeKey(user.id));
        return [mapped];
      }

      if (data.cardId) {
        const installments = Math.max(1, Math.min(12, data.installments || 1));
        const installmentAmounts = splitAmountIntoInstallments(amount, installments);
        const firstDate = new Date(`${baseDate}T12:00:00`);
        const seriesId = installments > 1 ? generateSeriesId() : null;

        const payloads: Tables<'transactions'>['Insert'][] = [];
        for (let i = 0; i < installments; i += 1) {
          const installmentDate = addMonths(firstDate, i);
          payloads.push({
            user_id: user.id,
            type: 'DESPESA',
            amount: installmentAmounts[i],
            description: data.description,
            date: formatDate(installmentDate, 'yyyy-MM-dd'),
            card_id: data.cardId,
            category_id: categoryId,
            installment_number: installments > 1 ? i + 1 : null,
            total_installments: installments > 1 ? installments : null,
            installment_series_id: seriesId,
            status: 'EFETIVADA',
            origin: 'MANUAL',
            is_pending: false,
            is_recurring: false,
          });
        }

        const { data: inserted, error } = await supabase.from('transactions').insert(payloads).select('*');
        if (error) throw error;

        const mapped = await hydrateTransactionRows((inserted || []) as Tables<'transactions'>[]);
        mergeTransactionsInCache(mapped, getScopeKey(user.id));
        return mapped;
      }

      const payload: Tables<'transactions'>['Insert'] = {
        user_id: user.id,
        type: data.type,
        amount,
        description: data.description,
        date: baseDate,
        account_id: data.accountId || null,
        category_id: categoryId,
        status: 'EFETIVADA',
        origin: 'MANUAL',
        is_pending: false,
        is_recurring: false,
      };

      const { data: inserted, error } = await supabase.from('transactions').insert(payload).select('*').single();
      if (error) throw error;

      const [mapped] = await hydrateTransactionRows([inserted]);
      mergeTransactionsInCache([mapped], getScopeKey(user.id));
      return [mapped];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: () => {
      toast({
        title: 'Erro ao criar transacao',
        description: 'Nao foi possivel registrar o lancamento.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: cancelled, error } = await supabase
        .from('transactions')
        .update({
          status: 'CANCELADA',
          is_pending: false,
        })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!cancelled?.id) throw new Error('Transaction not found');

      const scope = getScopeKey(user?.id);
      transactionsCacheByScope.set(
        scope,
        getScopedTransactions(scope).filter((item) => item.id !== id),
      );
      return { id: cancelled.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({ title: 'Transacao cancelada' });
    },
  });
}

export function useDeleteInstallmentSeries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const seriesId = await resolveSeriesId(transactionId);
      if (!seriesId) {
        throw new Error('Serie de parcelas nao encontrada para esta transacao.');
      }

      const { data: cancelledRows, error } = await supabase
        .from('transactions')
        .update({
          status: 'CANCELADA',
          is_pending: false,
        })
        .eq('installment_series_id', seriesId)
        .select('id');
      if (error) throw error;

      const deletedIds = new Set((cancelledRows || []).map((item) => item.id));
      const scope = getScopeKey(user?.id);
      transactionsCacheByScope.set(
        scope,
        getScopedTransactions(scope).filter((item) => !deletedIds.has(item.id)),
      );

      return { seriesId, deletedCount: deletedIds.size };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Parcelas canceladas',
        description: `${result.deletedCount} parcela(s) cancelada(s) da serie.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir serie',
        description: 'Nao foi possivel excluir a serie de parcelas.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTransactionInput }) => {
      const payload = buildUpdatePayload(data);

      const { data: updated, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      const [mapped] = await hydrateTransactionRows([updated]);
      mergeTransactionsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({ title: 'Transacao atualizada' });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar transacao',
        description: 'Nao foi possivel salvar as alteracoes.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInstallmentSeries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      transactionId,
      data,
    }: {
      transactionId: string;
      data: UpdateTransactionInput;
    }) => {
      const seriesId = await resolveSeriesId(transactionId);
      if (!seriesId) {
        throw new Error('Serie de parcelas nao encontrada para esta transacao.');
      }

      const payload = buildUpdatePayload(data);

      if (payload.amount !== undefined) {
        const { data: seriesRows, error: seriesError } = await supabase
          .from('transactions')
          .select('id')
          .eq('installment_series_id', seriesId);
        if (seriesError) throw seriesError;

        const updates = (seriesRows || []).map((row) =>
          supabase.from('transactions').update(payload).eq('id', row.id),
        );

        const results = await Promise.all(updates);
        const failed = results.find((result) => result.error);
        if (failed?.error) throw failed.error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('installment_series_id', seriesId);

        if (error) throw error;
      }

      const { data: updatedRows, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('installment_series_id', seriesId);
      if (fetchError) throw fetchError;

      const mapped = await hydrateTransactionRows((updatedRows || []) as Tables<'transactions'>[]);
      mergeTransactionsInCache(mapped, getScopeKey(user?.id));
      return { seriesId, updatedCount: mapped.length, rows: mapped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Serie atualizada',
        description: `${result.updatedCount} parcela(s) atualizada(s).`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar serie',
        description: 'Nao foi possivel salvar as alteracoes da serie.',
        variant: 'destructive',
      });
    },
  });
}

export function formatAmount(amount: number, type: TransactionType): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(amount));

  return type === 'DESPESA' ? `-${formatted}` : formatted;
}

export function formatTransactionDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getTransactionIcon(type: TransactionType, categoryIcon?: string): string {
  if (categoryIcon) return categoryIcon;

  switch (type) {
    case 'RECEITA':
      return 'arrow-down-circle';
    case 'DESPESA':
      return 'arrow-up-circle';
    case 'TRANSFERENCIA':
      return 'swap-horizontal';
    default:
      return 'circle';
  }
}
