import { applyFutureAccountBalanceEffects } from '@/lib/accountBalanceAdjustments';

describe('accountBalanceAdjustments', () => {
  it('subtracts future effects from current balance with cent rounding', () => {
    const accounts = [
      { id: 'acc-1', balance: 1000.005 },
      { id: 'acc-2', balance: 500 },
    ];

    const adjusted = applyFutureAccountBalanceEffects(accounts, {
      'acc-1': 200.004,
      'acc-2': -49.995,
    });

    expect(adjusted).toEqual([
      { id: 'acc-1', balance: 800 },
      { id: 'acc-2', balance: 550 },
    ]);
  });
});
