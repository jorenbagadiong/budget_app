import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageAdapter } from '@/lib/db/mock-storage';

describe('Security & Multi-Tenant User Data Isolation', () => {
  let storage: MockStorageAdapter;

  const USER_A = 'google-sub-user-a-111111111';
  const USER_B = 'google-sub-user-b-222222222';

  beforeEach(() => {
    storage = new MockStorageAdapter();
  });

  it('ensures User A and User B have separate accounts and categories', async () => {
    const userA = await storage.getOrCreateUser(USER_A, 'userA@gmail.com', 'User A');
    const userB = await storage.getOrCreateUser(USER_B, 'userB@gmail.com', 'User B');

    expect(userA.userId).toBe(USER_A);
    expect(userB.userId).toBe(USER_B);

    const accountsA = await storage.listAccounts(USER_A);
    const accountsB = await storage.listAccounts(USER_B);

    expect(accountsA.length).toBeGreaterThan(0);
    expect(accountsB.length).toBeGreaterThan(0);
    // Accounts belong strictly to their respective owners
    expect(accountsA.every((a) => a.userId === USER_A)).toBe(true);
    expect(accountsB.every((b) => b.userId === USER_B)).toBe(true);
  });

  it('prevents User B from viewing User A transactions', async () => {
    await storage.getOrCreateUser(USER_A, 'userA@gmail.com', 'User A');
    await storage.getOrCreateUser(USER_B, 'userB@gmail.com', 'User B');

    const accountsA = await storage.listAccounts(USER_A);
    const accountAId = accountsA[0].accountId;

    // User A adds a transaction
    await storage.createTransaction(USER_A, {
      accountId: accountAId,
      type: 'expense',
      amountMinor: 25000, // ₱250.00
      currency: 'PHP',
      categoryId: 'cat-food',
      description: 'Private confidential lunch',
      transactionDate: '2026-10-08',
      isRecurring: false,
    });

    // User A should see the transaction
    const txA = await storage.listTransactions(USER_A);
    expect(txA).toHaveLength(1);
    expect(txA[0].description).toBe('Private confidential lunch');

    // User B must NOT see User A's transaction
    const txB = await storage.listTransactions(USER_B);
    expect(txB).toHaveLength(0);
  });

  it('prevents User B from mutating or deleting User A transactions (BOLA / IDOR protection)', async () => {
    await storage.getOrCreateUser(USER_A, 'userA@gmail.com', 'User A');
    await storage.getOrCreateUser(USER_B, 'userB@gmail.com', 'User B');

    const accountsA = await storage.listAccounts(USER_A);
    const createdTx = await storage.createTransaction(USER_A, {
      accountId: accountsA[0].accountId,
      type: 'expense',
      amountMinor: 50000,
      currency: 'PHP',
      categoryId: 'cat-groceries',
      description: 'User A Groceries',
      transactionDate: '2026-10-08',
      isRecurring: false,
    });

    // User B attempts to update User A's transaction
    await expect(
      storage.updateTransaction(USER_B, createdTx.transactionId, {
        description: 'Hacked by User B',
      })
    ).rejects.toThrow();

    // Verify transaction remains unchanged
    const txList = await storage.listTransactions(USER_A);
    expect(txList[0].description).toBe('User A Groceries');

    // User B attempts to delete User A's transaction
    await expect(storage.deleteTransaction(USER_B, createdTx.transactionId)).rejects.toThrow();

    // Verify transaction still exists for User A
    const txListAfter = await storage.listTransactions(USER_A);
    expect(txListAfter).toHaveLength(1);
  });

  it('prevents User B from viewing or modifying User A budgets', async () => {
    await storage.getOrCreateUser(USER_A, 'userA@gmail.com', 'User A');
    await storage.getOrCreateUser(USER_B, 'userB@gmail.com', 'User B');

    // User A sets a budget
    const budgetA = await storage.upsertBudget(USER_A, {
      period: 'monthly',
      year: 2026,
      month: 10,
      categoryId: 'cat-utilities',
      amountMinor: 1000000, // ₱10,000.00
      currency: 'PHP',
    });

    // User B checks budgets
    const budgetsB = await storage.listBudgets(USER_B, { year: 2026, month: 10 });
    expect(budgetsB).toHaveLength(0);

    // User B attempts to delete User A's budget
    await expect(storage.deleteBudget(USER_B, budgetA.budgetId)).rejects.toThrow();
  });

  it('permanently purges all data when requested for privacy compliance', async () => {
    await storage.getOrCreateUser(USER_A, 'userA@gmail.com', 'User A');
    const accounts = await storage.listAccounts(USER_A);

    await storage.createTransaction(USER_A, {
      accountId: accounts[0].accountId,
      type: 'expense',
      amountMinor: 10000,
      currency: 'PHP',
      categoryId: 'cat-1',
      description: 'Lunch',
      transactionDate: '2026-10-08',
      isRecurring: false,
    });

    await storage.upsertBudget(USER_A, {
      period: 'monthly',
      year: 2026,
      month: 10,
      categoryId: 'cat-1',
      amountMinor: 50000,
      currency: 'PHP',
    });

    // Trigger full purge
    const purgeResult = await storage.purgeAllUserData(USER_A);
    expect(purgeResult.success).toBe(true);

    // Verify everything is deleted
    const txA = await storage.listTransactions(USER_A);
    const budgetsA = await storage.listBudgets(USER_A);
    const accountsA = await storage.listAccounts(USER_A);

    expect(txA).toHaveLength(0);
    expect(budgetsA).toHaveLength(0);
    expect(accountsA).toHaveLength(0);
  });
});
