import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BudgetStatus } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { findCategoryById } from '@/hooks/useCategories';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['budgets'];

type UiBudgetPeriod = 'monthly' | 'weekly' | 'custom';

type BudgetTxRow = {
  amount: number;
  date: string;
  category_id: string | null;
  type: string;
};

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  spent: number;
  period: UiBudgetPeriod;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

const budgetsCacheByScope = new Map<string, Budget[]>();

function getScopedBudgets(scope: string): Budget[] {
  return budgetsCacheByScope.get(scope) ?? [];
}

type BudgetInput = {
  name?: string;
  categoryId: string;
  amount: number;
  period: UiBudgetPeriod;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDbPeriod(period: UiBudgetPeriod): Enums<'budget_period'> {
  if (period === 'weekly') return 'SEMANAL';
  if (period === 'monthly') return 'MENSAL';
  return 'CUSTOM';
}

function fromDbPeriod(period: Enums<'budget_period'>): UiBudgetPeriod {
  if (period === 'SEMANAL') return 'weekly';
  if (period === 'MENSAL') return 'monthly';
  return 'custom';
}

function resolveRange(budget: Budget): { start: Date; end: Date } {
  const now = new Date();

  if (budget.period === 'weekly') {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }

  if (budget.period === 'custom') {
    const start = new Date(`${budget.startDate}T00:00:00`);
    const end = budget.endDate ? new Date(`${budget.endDate}T23:59:59`) : endOfMonth(start);
    return { start, end };
  }

  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

function calculateBudgetSpent(budget: Budget, transactions: BudgetTxRow[]): number {
  const { start, end } = resolveRange(budget);

  const spent = transactions
    .filter((tx) => tx.type === 'DESPESA' && tx.category_id === budget.categoryId)
    .filter((tx) => {
      const txDate = new Date(`${tx.date}T12:00:00`);
      return txDate >= start && txDate <= end;
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return Number(spent.toFixed(2));
}

function hydrateBudget(row: Tables<'budgets'>, transactions: BudgetTxRow[]): Budget {
  const category = findCategoryById(row.category_id || undefined);
  const mapped: Budget = {
    id: row.id,
    name: row.name,
    categoryId: row.category_id || '',
    categoryIcon: category?.icon || 'outros',
    categoryColor: category?.color || '#6B7280',
    amount: Number(row.amount || 0),
    spent: Number(row.spent || 0),
    period: fromDbPeriod(row.period),
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    isActive: row.is_active,
  };

  mapped.spent = calculateBudgetSpent(mapped, transactions);
  return mapped;
}

export function getBudgetsSnapshot(): Budget[] {
  const scope = getScopeKey(getActiveUserId());
  return [...getScopedBudgets(scope)];
}

export function useBudgets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const [budgetsRes, txRes] = await Promise.all([
        supabase.from('budgets').select('*').order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('amount, date, category_id, type')
          .eq('type', 'DESPESA')
          .eq('status', 'EFETIVADA')
          .eq('is_pending', false),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (txRes.error) throw txRes.error;

      const txRows = (txRes.data || []) as BudgetTxRow[];
      const mapped = (budgetsRes.data || []).map((row) => hydrateBudget(row, txRows));
      budgetsCacheByScope.set(scope, mapped);
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useBudget(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const [budgetRes, txRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('transactions')
          .select('amount, date, category_id, type')
          .eq('type', 'DESPESA')
          .eq('status', 'EFETIVADA')
          .eq('is_pending', false),
      ]);

      if (budgetRes.error) throw budgetRes.error;
      if (txRes.error) throw txRes.error;
      if (!budgetRes.data) return null;

      const txRows = (txRes.data || []) as BudgetTxRow[];
      const mapped = hydrateBudget(budgetRes.data, txRows);
      budgetsCacheByScope.set(
        scope,
        getScopedBudgets(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BudgetInput) => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const payload: Tables<'budgets'>['Insert'] = {
        user_id: user.id,
        name: data.name || 'Orcamento',
        category_id: data.categoryId || null,
        amount: Number(data.amount),
        period: toDbPeriod(data.period),
        start_date: data.startDate || toYmd(new Date()),
        end_date: data.endDate || null,
        is_active: data.isActive ?? true,
        spent: 0,
        remaining: Number(data.amount),
        progress: 0,
        status: 'ON_TRACK',
      };

      const { data: inserted, error } = await supabase.from('budgets').insert(payload).select('*').single();
      if (error) throw error;
      const mapped = hydrateBudget(inserted, []);
      const scope = getScopeKey(user.id);
      budgetsCacheByScope.set(scope, [mapped, ...getScopedBudgets(scope)]);
      return mapped;
    },
    onSuccess: (newBudget) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Orcamento criado!',
        description: `${newBudget.name} foi adicionado com sucesso.`,
      });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetInput> }) => {
      const payload: Tables<'budgets'>['Update'] = {
        name: data.name,
        category_id: data.categoryId !== undefined ? data.categoryId || null : undefined,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        period: data.period ? toDbPeriod(data.period) : undefined,
        start_date: data.startDate,
        end_date: data.endDate !== undefined ? data.endDate || null : undefined,
        is_active: data.isActive,
      };

      const { data: updated, error } = await supabase.from('budgets').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      const mapped = hydrateBudget(updated, []);
      const scope = getScopeKey(user?.id);
      budgetsCacheByScope.set(
        scope,
        getScopedBudgets(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    onSuccess: (updatedBudget) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Orcamento atualizado!',
        description: `${updatedBudget.name} foi atualizado.`,
      });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      const scope = getScopeKey(user?.id);
      budgetsCacheByScope.set(
        scope,
        getScopedBudgets(scope).filter((item) => item.id !== id),
      );
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Orcamento excluido',
        description: 'O orcamento foi removido com sucesso.',
      });
    },
  });
}

export function getBudgetStatus(budget: Budget): {
  status: BudgetStatus;
  color: string;
  message: string;
} {
  const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;

  if (percentage >= 100) {
    return { status: 'OVER', color: 'red', message: 'Orcamento estourado!' };
  }
  if (percentage >= 80) {
    return { status: 'WARNING', color: 'orange', message: 'Atencao: quase no limite' };
  }
  return { status: 'ON_TRACK', color: 'green', message: 'Dentro do orcamento' };
}

export function getBudgetProgress(budget: Budget): number {
  if (budget.amount === 0) return 0;
  return Math.min((budget.spent / budget.amount) * 100, 100);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
