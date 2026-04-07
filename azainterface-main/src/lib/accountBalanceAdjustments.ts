import { format as formatDate } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { computeFutureAccountEffects } from '@/lib/financialDomain';

type AccountBalanceLike = {
  id: string;
  balance: number;
};

type FutureTransactionRow = {
  account_id: string | null;
  transfer_to_account_id: string | null;
  type: string;
  amount: number | null;
};

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function loadFutureAccountBalanceEffects(accountIds: string[]): Promise<Record<string, number>> {
  if (!accountIds.length) return {};

  const today = formatDate(new Date(), 'yyyy-MM-dd');
  const accountSet = new Set(accountIds);

  const { data, error } = await supabase
    .from('transactions')
    .select('account_id, transfer_to_account_id, type, amount')
    .eq('status', 'EFETIVADA')
    .eq('is_pending', false)
    .gt('date', today)
    .or(`account_id.in.(${accountIds.join(',')}),transfer_to_account_id.in.(${accountIds.join(',')})`);

  if (error) throw error;

  const rows = ((data || []) as FutureTransactionRow[])
    .map((row) => ({
      accountId: row.account_id || undefined,
      transferToAccountId: row.transfer_to_account_id || undefined,
      type: row.type as 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA',
      amount: Number(row.amount || 0),
    }))
    .filter((row) => {
      const hasOrigin = !!row.accountId && accountSet.has(row.accountId);
      const hasDestination = !!row.transferToAccountId && accountSet.has(row.transferToAccountId);
      return hasOrigin || hasDestination;
    });

  return computeFutureAccountEffects(rows, accountIds);
}

export function applyFutureAccountBalanceEffects<T extends AccountBalanceLike>(
  accounts: T[],
  effects: Record<string, number>,
): T[] {
  return accounts.map((account) => {
    const futureEffect = effects[account.id] || 0;
    return {
      ...account,
      balance: roundToCents(Number(account.balance || 0) - futureEffect),
    };
  });
}
