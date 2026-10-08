import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageAdapter } from '@/lib/db/mock-storage';
import { toMinorUnits } from '@/lib/math/money';

describe('API & Domain Integration: Financial Operations Flow', () => {
  let storage: MockStorageAdapter;
  const USER_A = 'google-sub-flow-user-a';

  beforeEach(() => {
    storage = new MockStorageAdapter();
  });

  it('completes the full user lifecycle: Onboarding -> Accounts -> Transactions -> Budgets -> Dashboard -> Purge', async () => {
    // 1. User arrives & initializes profile
    const user = await storage.getOrCreateUser(USER_A, 'test@example.com', 'Test User');
    expect(user.userId).toBe(USER_A);

    // Initial accounts list should contain default Cash Wallet
    const accounts = await storage.listAccounts(USER_A);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    const cashAcc = accounts[0];

    // 2. User adds a Bank Account
    const bankAcc = await storage.createAccount(USER_A, {
      name: 'BPI Savings',
      type: 'bank',
      currency: 'PHP',
      initialBalanceMinor: toMinorUnits(50000), // ₱50,000.00
    });
    expect(bankAcc.name).toBe('BPI Savings');

    // 3. User lists categories
    const categories = await storage.listCategories(USER_A);
    expect(categories.length).toBeGreaterThan(0);
    const foodCat = categories.find((c) => c.name.includes('Food')) || categories[0];

    // 4. User records salary income
    const salaryTx = await storage.createTransaction(USER_A, {
      accountId: bankAcc.accountId,
      type: 'income',
      amountMinor: toMinorUnits(60000), // ₱60,000.00
      currency: 'PHP',
      categoryId: 'cat-salary',
      description: 'Monthly Salary',
      transactionDate: '2026-10-01',
      isRecurring: true,
    });
    expect(salaryTx.amountMinor).toBe(6000000);

    // 5. User records an expense
    const expenseTx = await storage.createTransaction(USER_A, {
      accountId: cashAcc.accountId,
      type: 'expense',
      amountMinor: toMinorUnits(2500), // ₱2,500.00
      currency: 'PHP',
      categoryId: foodCat.categoryId,
      description: 'Dinner with family',
      transactionDate: '2026-10-05',
      isRecurring: false,
    });
    expect(expenseTx.amountMinor).toBe(250000);

    // 6. User sets a monthly budget for Food
    const budget = await storage.upsertBudget(USER_A, {
      period: 'monthly',
      year: 2026,
      month: 10,
      categoryId: foodCat.categoryId,
      amountMinor: toMinorUnits(10000), // ₱10,000.00
      currency: 'PHP',
    });
    expect(budget.amountMinor).toBe(1000000);

    // 7. Inspect Dashboard Summary
    const summary = await storage.getDashboardSummary(USER_A, 2026, 10);
    expect(summary.totalIncomeMinor).toBe(6000000);
    expect(summary.totalExpenseMinor).toBe(250000);
    expect(summary.netSavingsMinor).toBe(5750000); // ₱60,000 - ₱2,500 = ₱57,500
    expect(summary.totalBudgetMinor).toBe(1000000); // ₱10,000
    expect(summary.budgetUtilizationPercent).toBe(25); // 2,500 / 10,000 = 25%

    // 8. Copy budget to next month (November 2026)
    const copyResult = await storage.copyBudgets(USER_A, 2026, 10, 2026, 11);
    expect(copyResult.copied).toBe(1);

    const novBudgets = await storage.listBudgets(USER_A, { year: 2026, month: 11 });
    expect(novBudgets).toHaveLength(1);
    expect(novBudgets[0].amountMinor).toBe(1000000);

    // 9. Cascade purge all user data (Right to be Forgotten)
    const purge = await storage.purgeAllUserData(USER_A);
    expect(purge.success).toBe(true);

    const txRemaining = await storage.listTransactions(USER_A);
    expect(txRemaining).toHaveLength(0);
    const budgetsRemaining = await storage.listBudgets(USER_A);
    expect(budgetsRemaining).toHaveLength(0);
  });
});
