import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Account, AccountType, CreateAccountPayload, UpdateAccountPayload } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  applyFutureAccountBalanceEffects,
  loadFutureAccountBalanceEffects,
} from '@/lib/accountBalanceAdjustments';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';
import {
  Landmark,
  PiggyBank,
  Wallet,
  BarChart3,
  CreditCard,
  Package,
  type LucideIcon,
} from 'lucide-react';

const QUERY_KEY = ['accounts'];
const accountsCacheByScope = new Map<string, Account[]>();

function getScopedAccounts(scope: string): Account[] {
  return accountsCacheByScope.get(scope) ?? [];
}

function mapAccountRow(row: Tables<'accounts'>): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as AccountType,
    balance: Number(row.balance || 0),
    initialBalance: Number(row.initial_balance || 0),
    isAuto: row.is_auto,
    isArchived: row.is_archived,
    color: row.color || undefined,
    institution: row.institution || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cards: [],
  };
}

function mergeAccountsInCache(items: Account[], scope: string) {
  const byId = new Map(getScopedAccounts(scope).map((account) => [account.id, account]));
  items.forEach((item) => byId.set(item.id, item));
  accountsCacheByScope.set(scope, [...byId.values()]);
}

export function getAccountsSnapshot(includeArchived = true): Account[] {
  const scope = getScopeKey(getActiveUserId());
  const scoped = getScopedAccounts(scope);
  return includeArchived ? [...scoped] : scoped.filter((account) => !account.isArchived);
}

export function findAccountById(id?: string): Account | undefined {
  if (!id) return undefined;
  const scope = getScopeKey(getActiveUserId());
  return getScopedAccounts(scope).find((account) => account.id === id);
}

export function useAccounts(includeArchived = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, { includeArchived }],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);

      let query = supabase.from('accounts').select('*').order('created_at', { ascending: false });
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(mapAccountRow);
      const effects = await loadFutureAccountBalanceEffects(mapped.map((account) => account.id));
      const adjusted = applyFutureAccountBalanceEffects(mapped, effects);
      mergeAccountsInCache(adjusted, scope);
      return adjusted;
    },
    staleTime: 30_000,
  });
}

export function useArchivedAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, 'archived'],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(mapAccountRow);
      const effects = await loadFutureAccountBalanceEffects(mapped.map((account) => account.id));
      const adjusted = applyFutureAccountBalanceEffects(mapped, effects);
      mergeAccountsInCache(adjusted, scope);
      return adjusted;
    },
    staleTime: 30_000,
  });
}

export function useAccount(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);

      const { data, error } = await supabase.from('accounts').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapAccountRow(data);
      const effects = await loadFutureAccountBalanceEffects([mapped.id]);
      const [adjusted] = applyFutureAccountBalanceEffects([mapped], effects);
      mergeAccountsInCache([adjusted], scope);
      return adjusted;
    },
    staleTime: 30_000,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAccountPayload): Promise<Account> => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const initialBalance = Number(data.initialBalance || 0);
      const payload: Tables<'accounts'>['Insert'] = {
        user_id: user.id,
        name: data.name,
        type: data.type,
        initial_balance: initialBalance,
        balance: initialBalance,
        institution: data.institution || null,
        color: data.color || null,
        is_auto: false,
        is_archived: false,
      };

      const { data: inserted, error } = await supabase.from('accounts').insert(payload).select('*').single();
      if (error) throw error;
      const mapped = mapAccountRow(inserted);
      mergeAccountsInCache([mapped], getScopeKey(user.id));
      return mapped;
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Conta criada!',
        description: `${newAccount.name} foi adicionada com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao criar conta',
        description: 'Nao foi possivel criar a conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAccountPayload }): Promise<Account> => {
      const payload: Tables<'accounts'>['Update'] = {
        name: data.name,
        institution: data.institution ?? null,
        color: data.color ?? null,
      };

      const { data: updated, error } = await supabase.from('accounts').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      const mapped = mapAccountRow(updated);
      mergeAccountsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Conta atualizada!',
        description: `${updatedAccount.name} foi atualizada.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar conta',
        description: 'Nao foi possivel atualizar a conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('accounts').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Conta arquivada',
        description: 'A conta foi arquivada para preservar o historico financeiro.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir conta',
        description: 'Nao foi possivel excluir a conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Account> => {
      const { data, error } = await supabase
        .from('accounts')
        .update({ is_archived: true })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      const mapped = mapAccountRow(data);
      mergeAccountsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: (archivedAccount) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Conta arquivada',
        description: `${archivedAccount.name} foi arquivada com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao arquivar conta',
        description: 'Nao foi possivel arquivar a conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUnarchiveAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Account> => {
      const { data, error } = await supabase
        .from('accounts')
        .update({ is_archived: false })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      const mapped = mapAccountRow(data);
      mergeAccountsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: (unarchivedAccount) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Conta restaurada',
        description: `${unarchivedAccount.name} foi restaurada com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao restaurar conta',
        description: 'Nao foi possivel restaurar a conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function calculateTotalBalance(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    if (['CORRENTE', 'POUPANCA', 'CARTEIRA', 'INVESTIMENTO'].includes(account.type)) {
      return total + Number(account.balance);
    }
    if (account.type === 'CREDITO') {
      return total - Number(account.balance);
    }
    return total + Number(account.balance);
  }, 0);
}

export function groupAccountsByType(accounts: Account[]): Record<AccountType, Account[]> {
  const grouped: Record<AccountType, Account[]> = {
    CORRENTE: [],
    POUPANCA: [],
    CARTEIRA: [],
    INVESTIMENTO: [],
    CREDITO: [],
    OUTROS: [],
  };

  accounts.forEach((account) => {
    grouped[account.type].push(account);
  });

  return grouped;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CORRENTE: 'Conta Corrente',
  POUPANCA: 'Poupanca',
  CARTEIRA: 'Carteira',
  INVESTIMENTO: 'Investimento',
  CREDITO: 'Credito',
  OUTROS: 'Outros',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  CORRENTE: Landmark,
  POUPANCA: PiggyBank,
  CARTEIRA: Wallet,
  INVESTIMENTO: BarChart3,
  CREDITO: CreditCard,
  OUTROS: Package,
};

export const ACCOUNT_COLORS = [
  '#820AD1',
  '#FF7A00',
  '#005CA9',
  '#22C55E',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

export const INSTITUTIONS = [
  'Nubank',
  'Inter',
  'Itau',
  'Bradesco',
  'Santander',
  'Caixa Economica',
  'Banco do Brasil',
  'C6 Bank',
  'PicPay',
  'Mercado Pago',
  'PagBank',
  'Neon',
  'Next',
  'Original',
  'BTG Pactual',
  'XP Investimentos',
  'Outro',
];
