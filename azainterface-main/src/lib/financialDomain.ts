import type { TransactionFilters } from '@/types/entities';

type AmountBearingTransaction = {
  id: string;
  accountId?: string;
  transferToAccountId?: string;
  type: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
  amount: number;
  date: string;
  createdAt: string;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
};

type FutureEffectRow = {
  accountId?: string;
  transferToAccountId?: string;
  type: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
  amount: number;
};

function isUuid(value?: string): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function splitAmountIntoInstallments(totalAmount: number, installments: number): number[] {
  const safeInstallments = Math.max(1, Math.trunc(installments || 1));
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / safeInstallments);
  const remainderCents = totalCents - baseCents * safeInstallments;

  return Array.from({ length: safeInstallments }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return Number((cents / 100).toFixed(2));
  });
}

export function computeFutureAccountEffects(
  rows: FutureEffectRow[],
  accountIds: string[],
): Record<string, number> {
  const accountSet = new Set(accountIds);
  const effects: Record<string, number> = {};

  const add = (accountId: string, value: number) => {
    effects[accountId] = Number(((effects[accountId] || 0) + value).toFixed(2));
  };

  rows.forEach((row) => {
    const amount = Number(row.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) return;

    if (row.type === 'RECEITA' && row.accountId && accountSet.has(row.accountId)) {
      add(row.accountId, amount);
      return;
    }

    if (row.type === 'DESPESA' && row.accountId && accountSet.has(row.accountId)) {
      add(row.accountId, -amount);
      return;
    }

    if (row.type === 'TRANSFERENCIA') {
      if (row.accountId && accountSet.has(row.accountId)) add(row.accountId, -amount);
      if (row.transferToAccountId && accountSet.has(row.transferToAccountId)) {
        add(row.transferToAccountId, amount);
      }
    }
  });

  return effects;
}

function compare(
  a: AmountBearingTransaction,
  b: AmountBearingTransaction,
  sortBy: NonNullable<TransactionFilters['sortBy']>,
  sortOrder: NonNullable<TransactionFilters['sortOrder']>,
) {
  const direction = sortOrder === 'asc' ? 1 : -1;

  if (sortBy === 'amount') return (a.amount - b.amount) * direction;
  if (sortBy === 'createdAt') {
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
  }

  const dateDiff = new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime();
  if (dateDiff !== 0) return dateDiff * direction;

  return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
}

export function applyTransactionContractFilters<T extends AmountBearingTransaction>(
  transactions: T[],
  filters?: Pick<TransactionFilters, 'minAmount' | 'maxAmount' | 'tag' | 'sortBy' | 'sortOrder' | 'page' | 'limit'>,
): T[] {
  let filtered = [...transactions];

  if (typeof filters?.minAmount === 'number') {
    filtered = filtered.filter((item) => item.amount >= filters.minAmount!);
  }

  if (typeof filters?.maxAmount === 'number') {
    filtered = filtered.filter((item) => item.amount <= filters.maxAmount!);
  }

  if (filters?.tag?.trim()) {
    const needle = filters.tag.trim().toLowerCase();
    filtered = filtered.filter((item) =>
      (item.tags || []).some((entry) => {
        const tagId = entry.tag.id.toLowerCase();
        const tagName = entry.tag.name.toLowerCase();
        if (isUuid(needle)) return tagId === needle;
        return tagName.includes(needle);
      }),
    );
  }

  const sortBy = filters?.sortBy || 'date';
  const sortOrder = filters?.sortOrder || 'desc';
  filtered.sort((a, b) => compare(a, b, sortBy, sortOrder));

  if (filters?.limit) {
    const page = Math.max(1, filters.page || 1);
    const from = (page - 1) * filters.limit;
    return filtered.slice(from, from + filters.limit);
  }

  return filtered;
}
