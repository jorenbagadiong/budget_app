import type { IBudgetStorage } from './types';
import type {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  RecurringTransaction,
  DashboardSummary,
  CategorySpendBreakdown,
  SpendingTrendPoint,
} from '@/types';
import {
  addMinor,
  subtractMinor,
  calculateUtilization,
  calculateSavings,
  calculatePercentage,
} from '@/lib/math/money';

// Default starter categories
const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense'; icon: string; color: string }> = [
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#EF4444' },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#F97316' },
  { name: 'Housing & Rent', type: 'expense', icon: 'Home', color: '#F59E0B' },
  { name: 'Utilities & Bills', type: 'expense', icon: 'Zap', color: '#10B981' },
  { name: 'Transportation', type: 'expense', icon: 'Car', color: '#06B6D4' },
  { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#3B82F6' },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#6366F1' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#8B5CF6' },
  { name: 'Salary / Income', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { name: 'Freelance & Business', type: 'income', icon: 'Laptop', color: '#059669' },
  { name: 'Investments', type: 'income', icon: 'TrendingUp', color: '#047857' },
  { name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: '#6B7280' },
];

export class MockStorageAdapter implements IBudgetStorage {
  private users: Map<string, User> = new Map();
  private accounts: Map<string, Account> = new Map();
  private categories: Map<string, Category> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private budgets: Map<string, Budget> = new Map();
  private recurring: Map<string, RecurringTransaction> = new Map();

  async getOrCreateUser(userId: string, email: string, displayName: string): Promise<User> {
    const existing = this.users.get(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newUser: User = {
      userId,
      email,
      displayName: displayName || 'Budget User',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userId, newUser);

    // Create default Cash account
    const defaultAccountId = crypto.randomUUID();
    this.accounts.set(defaultAccountId, {
      accountId: defaultAccountId,
      userId,
      name: 'Cash Wallet',
      type: 'cash',
      currency: 'PHP',
      initialBalanceMinor: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Seed default categories for this user
    for (const cat of DEFAULT_CATEGORIES) {
      const catId = crypto.randomUUID();
      this.categories.set(catId, {
        categoryId: catId,
        userId,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newUser;
  }

  async updateUserSettings(
    userId: string,
    settings: Partial<Pick<User, 'currency' | 'timezone' | 'displayName'>>
  ): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found.');

    const updated: User = {
      ...user,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async purgeAllUserData(userId: string): Promise<{ success: boolean; deleted: Record<string, number> }> {
    let accountsDel = 0;
    let categoriesDel = 0;
    let txDel = 0;
    let budgetsDel = 0;
    let recurringDel = 0;

    for (const [id, acc] of this.accounts) {
      if (acc.userId === userId) {
        this.accounts.delete(id);
        accountsDel++;
      }
    }
    for (const [id, cat] of this.categories) {
      if (cat.userId === userId) {
        this.categories.delete(id);
        categoriesDel++;
      }
    }
    for (const [id, tx] of this.transactions) {
      if (tx.userId === userId) {
        this.transactions.delete(id);
        txDel++;
      }
    }
    for (const [id, b] of this.budgets) {
      if (b.userId === userId) {
        this.budgets.delete(id);
        budgetsDel++;
      }
    }
    for (const [id, r] of this.recurring) {
      if (r.userId === userId) {
        this.recurring.delete(id);
        recurringDel++;
      }
    }
    this.users.delete(userId);

    return {
      success: true,
      deleted: {
        accounts: accountsDel,
        categories: categoriesDel,
        transactions: txDel,
        budgets: budgetsDel,
        recurring: recurringDel,
      },
    };
  }

  async listAccounts(userId: string): Promise<Account[]> {
    const userAccounts: Account[] = [];
    for (const acc of this.accounts.values()) {
      if (acc.userId === userId) {
        // Calculate current balance based on transactions
        let balance = acc.initialBalanceMinor;
        for (const tx of this.transactions.values()) {
          if (tx.userId === userId) {
            if (tx.accountId === acc.accountId) {
              if (tx.type === 'income') balance = addMinor(balance, tx.amountMinor);
              if (tx.type === 'expense') balance = subtractMinor(balance, tx.amountMinor);
              if (tx.type === 'transfer') balance = subtractMinor(balance, tx.amountMinor);
            }
            if (tx.toAccountId === acc.accountId && tx.type === 'transfer') {
              balance = addMinor(balance, tx.amountMinor);
            }
          }
        }
        userAccounts.push({ ...acc, currentBalanceMinor: balance });
      }
    }
    return userAccounts;
  }

  async createAccount(
    userId: string,
    data: Omit<Account, 'accountId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    const accountId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newAcc: Account = {
      accountId,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.set(accountId, newAcc);
    return newAcc;
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: Partial<Omit<Account, 'accountId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Account> {
    const existing = this.accounts.get(accountId);
    if (!existing || existing.userId !== userId) throw new Error('Account not found.');
    const updated: Account = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.accounts.set(accountId, updated);
    return updated;
  }

  async deleteAccount(userId: string, accountId: string): Promise<{ success: boolean }> {
    const existing = this.accounts.get(accountId);
    if (!existing || existing.userId !== userId) throw new Error('Account not found.');
    this.accounts.delete(accountId);
    return { success: true };
  }

  async listCategories(userId: string): Promise<Category[]> {
    const results: Category[] = [];
    for (const cat of this.categories.values()) {
      if (cat.userId === userId || cat.userId === 'SYSTEM') {
        results.push(cat);
      }
    }
    return results;
  }

  async createCategory(
    userId: string,
    data: Omit<Category, 'categoryId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Category> {
    const categoryId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newCat: Category = {
      categoryId,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.set(categoryId, newCat);
    return newCat;
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    data: Partial<Omit<Category, 'categoryId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Category> {
    const existing = this.categories.get(categoryId);
    if (!existing || existing.userId !== userId) throw new Error('Category not found or unauthorized.');
    const updated: Category = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.categories.set(categoryId, updated);
    return updated;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean }> {
    const existing = this.categories.get(categoryId);
    if (!existing || existing.userId !== userId) throw new Error('Category not found or unauthorized.');
    this.categories.delete(categoryId);
    return { success: true };
  }

  async listTransactions(
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      accountId?: string;
      categoryId?: string;
      type?: string;
    }
  ): Promise<Transaction[]> {
    const results: Transaction[] = [];
    for (const tx of this.transactions.values()) {
      if (tx.userId !== userId) continue;
      if (filters?.startDate && tx.transactionDate < filters.startDate) continue;
      if (filters?.endDate && tx.transactionDate > filters.endDate) continue;
      if (filters?.accountId && tx.accountId !== filters.accountId && tx.toAccountId !== filters.accountId) continue;
      if (filters?.categoryId && tx.categoryId !== filters.categoryId) continue;
      if (filters?.type && tx.type !== filters.type) continue;
      results.push(tx);
    }
    // Sort descending by date
    results.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    return results;
  }

  async createTransaction(
    userId: string,
    data: Omit<Transaction, 'transactionId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    const transactionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTx: Transaction = {
      transactionId,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.set(transactionId, newTx);
    return newTx;
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    data: Partial<Omit<Transaction, 'transactionId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Transaction> {
    const existing = this.transactions.get(transactionId);
    if (!existing || existing.userId !== userId) throw new Error('Transaction not found.');
    const updated: Transaction = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.transactions.set(transactionId, updated);
    return updated;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<{ success: boolean }> {
    const existing = this.transactions.get(transactionId);
    if (!existing || existing.userId !== userId) throw new Error('Transaction not found.');
    this.transactions.delete(transactionId);
    return { success: true };
  }

  async listBudgets(userId: string, filters?: { year?: number; month?: number }): Promise<Budget[]> {
    const results: Budget[] = [];
    for (const b of this.budgets.values()) {
      if (b.userId !== userId) continue;
      if (filters?.year && b.year !== filters.year) continue;
      if (filters?.month && b.month !== filters.month) continue;
      results.push(b);
    }
    return results;
  }

  async upsertBudget(
    userId: string,
    data: Omit<Budget, 'budgetId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Budget> {
    const now = new Date().toISOString();
    // Check if budget exists for this period, year, month, and category
    for (const [id, existing] of this.budgets.entries()) {
      if (
        existing.userId === userId &&
        existing.period === data.period &&
        existing.year === data.year &&
        existing.month === (data.month ?? null) &&
        existing.categoryId === (data.categoryId || '')
      ) {
        const updated: Budget = {
          ...existing,
          amountMinor: data.amountMinor,
          currency: data.currency,
          updatedAt: now,
        };
        this.budgets.set(id, updated);
        return updated;
      }
    }

    const budgetId = crypto.randomUUID();
    const newBudget: Budget = {
      budgetId,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.budgets.set(budgetId, newBudget);
    return newBudget;
  }

  async deleteBudget(userId: string, budgetId: string): Promise<{ success: boolean }> {
    const existing = this.budgets.get(budgetId);
    if (!existing || existing.userId !== userId) throw new Error('Budget not found.');
    this.budgets.delete(budgetId);
    return { success: true };
  }

  async copyBudgets(
    userId: string,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number
  ): Promise<{ copied: number }> {
    const sourceBudgets = await this.listBudgets(userId, { year: fromYear, month: fromMonth });
    let count = 0;
    for (const b of sourceBudgets) {
      await this.upsertBudget(userId, {
        period: b.period,
        year: toYear,
        month: toMonth,
        categoryId: b.categoryId,
        amountMinor: b.amountMinor,
        currency: b.currency,
      });
      count++;
    }
    return { copied: count };
  }

  async listRecurring(userId: string): Promise<RecurringTransaction[]> {
    const results: RecurringTransaction[] = [];
    for (const r of this.recurring.values()) {
      if (r.userId === userId) results.push(r);
    }
    return results;
  }

  async createRecurring(
    userId: string,
    data: Omit<RecurringTransaction, 'recurringRuleId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringTransaction> {
    const recurringRuleId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newRule: RecurringTransaction = {
      recurringRuleId,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.recurring.set(recurringRuleId, newRule);
    return newRule;
  }

  async updateRecurring(
    userId: string,
    recurringRuleId: string,
    data: Partial<Omit<RecurringTransaction, 'recurringRuleId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<RecurringTransaction> {
    const existing = this.recurring.get(recurringRuleId);
    if (!existing || existing.userId !== userId) throw new Error('Recurring rule not found.');
    const updated: RecurringTransaction = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.recurring.set(recurringRuleId, updated);
    return updated;
  }

  async deleteRecurring(userId: string, recurringRuleId: string): Promise<{ success: boolean }> {
    const existing = this.recurring.get(recurringRuleId);
    if (!existing || existing.userId !== userId) throw new Error('Recurring rule not found.');
    this.recurring.delete(recurringRuleId);
    return { success: true };
  }

  async getDashboardSummary(userId: string, year: number, month: number): Promise<DashboardSummary> {
    const user = this.users.get(userId);
    const currency = user?.currency || 'PHP';

    const monthStr = String(month).padStart(2, '0');
    const startPrefix = `${year}-${monthStr}`;

    // Get categories and accounts for mapping
    const categories = await this.listCategories(userId);
    const accounts = await this.listAccounts(userId);
    const catMap = new Map(categories.map((c) => [c.categoryId, c]));
    const accMap = new Map(accounts.map((a) => [a.accountId, a]));

    // All transactions for the month
    const allUserTx = await this.listTransactions(userId);
    const monthTx = allUserTx.filter((t) => t.transactionDate.startsWith(startPrefix));

    let totalIncomeMinor = 0;
    let totalExpenseMinor = 0;
    const categorySpendMap = new Map<string, number>();

    for (const tx of monthTx) {
      if (tx.type === 'income') {
        totalIncomeMinor = addMinor(totalIncomeMinor, tx.amountMinor);
      } else if (tx.type === 'expense') {
        totalExpenseMinor = addMinor(totalExpenseMinor, tx.amountMinor);
        const currentCatSpend = categorySpendMap.get(tx.categoryId) || 0;
        categorySpendMap.set(tx.categoryId, addMinor(currentCatSpend, tx.amountMinor));
      }
    }

    const netSavingsMinor = calculateSavings(totalIncomeMinor, totalExpenseMinor);

    // Monthly budgets
    const budgets = await this.listBudgets(userId, { year, month });
    let totalBudgetMinor = 0;
    const catBudgetMap = new Map<string, number>();

    for (const b of budgets) {
      totalBudgetMinor = addMinor(totalBudgetMinor, b.amountMinor);
      if (b.categoryId) {
        catBudgetMap.set(b.categoryId, b.amountMinor);
      }
    }

    const remainingBudgetMinor = subtractMinor(totalBudgetMinor, totalExpenseMinor);
    const budgetUtilizationPercent = calculateUtilization(totalExpenseMinor, totalBudgetMinor);

    // Category breakdown
    const categorySpendBreakdown: CategorySpendBreakdown[] = [];
    for (const [catId, spentMinor] of categorySpendMap.entries()) {
      const cat = catMap.get(catId);
      const budgetForCat = catBudgetMap.get(catId) || 0;
      const utilization = calculateUtilization(spentMinor, budgetForCat);
      categorySpendBreakdown.push({
        categoryId: catId,
        categoryName: cat?.name || 'Uncategorized',
        color: cat?.color || '#6B7280',
        icon: cat?.icon || 'Tag',
        spentMinor,
        percentage: calculatePercentage(spentMinor, totalExpenseMinor),
        budgetMinor: budgetForCat,
        utilizationPercent: utilization,
        isOverBudget: budgetForCat > 0 && spentMinor > budgetForCat,
      });
    }

    // Sort categories by highest spend
    categorySpendBreakdown.sort((a, b) => b.spentMinor - a.spentMinor);

    // Recent 5 transactions with enriched names
    const recentTransactions = monthTx.slice(0, 5).map((t) => ({
      ...t,
      categoryName: catMap.get(t.categoryId)?.name || 'Uncategorized',
      accountName: accMap.get(t.accountId)?.name || 'Account',
    }));

    // Spending trends for the last 6 months
    const spendingTrends: SpendingTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(year, month - 1 - i, 1);
      const tYear = targetDate.getFullYear();
      const tMonth = targetDate.getMonth() + 1;
      const tPrefix = `${tYear}-${String(tMonth).padStart(2, '0')}`;
      const label = targetDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      let tIncome = 0;
      let tExpense = 0;
      for (const tx of allUserTx) {
        if (tx.transactionDate.startsWith(tPrefix)) {
          if (tx.type === 'income') tIncome = addMinor(tIncome, tx.amountMinor);
          if (tx.type === 'expense') tExpense = addMinor(tExpense, tx.amountMinor);
        }
      }
      spendingTrends.push({
        label,
        incomeMinor: tIncome,
        expenseMinor: tExpense,
        savingsMinor: calculateSavings(tIncome, tExpense),
      });
    }

    return {
      year,
      month,
      currency,
      totalIncomeMinor,
      totalExpenseMinor,
      netSavingsMinor,
      totalBudgetMinor,
      remainingBudgetMinor,
      budgetUtilizationPercent,
      transactionCount: monthTx.length,
      categorySpendBreakdown,
      recentTransactions,
      spendingTrends,
    };
  }
}
