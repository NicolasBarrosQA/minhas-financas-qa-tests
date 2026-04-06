import { useQuery } from '@tanstack/react-query';
import { format as formatDate } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { AccountType, TransactionStatus, TransactionType } from '@/types/entities';
import { useAuth } from '@/providers/AuthProvider';
import {
  applyFutureAccountBalanceEffects,
  loadFutureAccountBalanceEffects,
} from '@/lib/accountBalanceAdjustments';
import { parseLocalDate } from '@/lib/date';

type DashboardAccountRow = {
  id: string;
  balance: number;
  type: AccountType;
  is_archived: boolean;
};

type DashboardCardRow = {
  id: string;
  is_archived: boolean;
};

type DashboardTxRow = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  date: string;
  is_pending: boolean;
};

function calculateTotalBalance(accounts: DashboardAccountRow[]): number {
  return accounts.reduce((total, account) => {
    const balance = Number(account.balance || 0);
    if (['CORRENTE', 'POUPANCA', 'CARTEIRA', 'INVESTIMENTO'].includes(account.type)) {
      return total + balance;
    }
    if (account.type === 'CREDITO') {
      return total - balance;
    }
    return total + balance;
  }, 0);
}

export function useDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const now = new Date();
      const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const today = formatDate(now, 'yyyy-MM-dd');

      const [accountsRes, cardsRes, txRes] = await Promise.all([
        supabase.from('accounts').select('id, balance, type, is_archived').eq('is_archived', false),
        supabase.from('cards').select('id, is_archived').eq('is_archived', false),
        supabase
          .from('transactions')
          .select('id, type, status, amount, date, is_pending')
          .gte('date', monthStart)
          .lte('date', today)
          .order('date', { ascending: false })
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (cardsRes.error) throw cardsRes.error;
      if (txRes.error) throw txRes.error;

      const accounts = (accountsRes.data || []) as DashboardAccountRow[];
      const cards = (cardsRes.data || []) as DashboardCardRow[];
      const transactions = (txRes.data || []) as DashboardTxRow[];
      const futureEffects = await loadFutureAccountBalanceEffects(accounts.map((account) => account.id));
      const effectiveAccounts = applyFutureAccountBalanceEffects(accounts, futureEffects);

      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthTransactions = transactions.filter((tx) => {
        const date = parseLocalDate(tx.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear && tx.date <= today;
      });

      const settledMonthTransactions = monthTransactions.filter((tx) => tx.status === 'EFETIVADA' && !tx.is_pending);

      const monthlyIncome = settledMonthTransactions
        .filter((tx) => tx.type === 'RECEITA')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const monthlyExpenses = settledMonthTransactions
        .filter((tx) => tx.type === 'DESPESA')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const savingsRate = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

      return {
        totalBalance: calculateTotalBalance(effectiveAccounts),
        monthlyIncome,
        monthlyExpenses,
        savingsRate,
        accountsCount: effectiveAccounts.length,
        cardsCount: cards.length,
        pendingTransactions: monthTransactions.filter((tx) => tx.status === 'PENDENTE' || tx.is_pending).length,
        accounts: effectiveAccounts,
        cards,
        recentTransactions: transactions,
      };
    },
    staleTime: 20_000,
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}

export function getBalanceColor(value: number): string {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-destructive';
  return 'text-foreground';
}
