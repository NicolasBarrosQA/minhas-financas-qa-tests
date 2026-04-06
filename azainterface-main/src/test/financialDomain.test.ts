import {
  applyTransactionContractFilters,
  computeFutureAccountEffects,
  splitAmountIntoInstallments,
} from '@/lib/financialDomain';

describe('financialDomain', () => {
  it('splits installment values with cent precision and preserves total', () => {
    const values = splitAmountIntoInstallments(100, 3);

    expect(values).toEqual([33.34, 33.33, 33.33]);
    expect(Number(values.reduce((sum, value) => sum + value, 0).toFixed(2))).toBe(100);
  });

  it('handles odd cent totals during installment split', () => {
    const values = splitAmountIntoInstallments(10.01, 2);

    expect(values).toEqual([5.01, 5.0]);
    expect(Number(values.reduce((sum, value) => sum + value, 0).toFixed(2))).toBe(10.01);
  });

  it('computes future account effects respecting transaction type semantics', () => {
    const effects = computeFutureAccountEffects(
      [
        { accountId: 'acc-a', type: 'RECEITA', amount: 100 },
        { accountId: 'acc-a', type: 'DESPESA', amount: 50 },
        { accountId: 'acc-a', transferToAccountId: 'acc-b', type: 'TRANSFERENCIA', amount: 30 },
        { accountId: 'acc-c', transferToAccountId: 'acc-a', type: 'TRANSFERENCIA', amount: 20 },
        { accountId: 'acc-b', transferToAccountId: 'acc-c', type: 'TRANSFERENCIA', amount: 5 },
      ],
      ['acc-a', 'acc-b'],
    );

    expect(effects).toEqual({
      'acc-a': 40,
      'acc-b': 25,
    });
  });

  it('applies filter contract for min/max amount, tag and sorting', () => {
    const rows = [
      {
        id: 'tx-1',
        type: 'DESPESA' as const,
        amount: 30,
        date: '2026-03-22',
        createdAt: '2026-03-22T10:00:00.000Z',
        tags: [{ tag: { id: 'tag-food', name: 'Alimentacao' } }],
      },
      {
        id: 'tx-2',
        type: 'DESPESA' as const,
        amount: 120,
        date: '2026-03-21',
        createdAt: '2026-03-21T10:00:00.000Z',
        tags: [{ tag: { id: 'tag-house', name: 'Moradia' } }],
      },
      {
        id: 'tx-3',
        type: 'DESPESA' as const,
        amount: 80,
        date: '2026-03-23',
        createdAt: '2026-03-23T10:00:00.000Z',
        tags: [{ tag: { id: 'tag-food', name: 'Alimentacao' } }],
      },
    ];

    const filtered = applyTransactionContractFilters(rows, {
      minAmount: 40,
      maxAmount: 120,
      tag: 'alimen',
      sortBy: 'amount',
      sortOrder: 'asc',
    });

    expect(filtered.map((item) => item.id)).toEqual(['tx-3']);
  });

  it('supports pagination after sorting in the filter contract', () => {
    const rows = [
      {
        id: 'tx-1',
        type: 'DESPESA' as const,
        amount: 10,
        date: '2026-03-20',
        createdAt: '2026-03-20T10:00:00.000Z',
      },
      {
        id: 'tx-2',
        type: 'DESPESA' as const,
        amount: 20,
        date: '2026-03-21',
        createdAt: '2026-03-21T10:00:00.000Z',
      },
      {
        id: 'tx-3',
        type: 'DESPESA' as const,
        amount: 30,
        date: '2026-03-22',
        createdAt: '2026-03-22T10:00:00.000Z',
      },
    ];

    const paged = applyTransactionContractFilters(rows, {
      sortBy: 'date',
      sortOrder: 'desc',
      page: 2,
      limit: 1,
    });

    expect(paged.map((item) => item.id)).toEqual(['tx-2']);
  });
});
