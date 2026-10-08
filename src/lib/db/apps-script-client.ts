import type { IBudgetStorage } from './types';
import type {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  RecurringTransaction,
  DashboardSummary,
} from '@/types';
import {
  addMinor,
  subtractMinor,
  calculateUtilization,
  calculateSavings,
  calculatePercentage,
} from '@/lib/math/money';

export class AppsScriptClient implements IBudgetStorage {
  private scriptUrl: string;
  private sharedSecret: string;

  constructor() {
    this.scriptUrl = process.env.APPS_SCRIPT_URL || '';
    this.sharedSecret = process.env.APPS_SCRIPT_SHARED_SECRET || '';
  }

  private async dispatch<T>(action: string, userId: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.scriptUrl) {
      throw new Error('APPS_SCRIPT_URL environment variable is not configured.');
    }

    const body = {
      action,
      userId,
      payload,
      timestamp: new Date().toISOString(),
      secretToken: this.sharedSecret,
    };

    const response = await fetch(this.scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Prevent stale browser caching on Google Apps Script calls
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Google Apps Script API execution failed.');
    }

    return data.data as T;
  }

  async getOrCreateUser(userId: string, email: string, displayName: string): Promise<User> {
    return this.dispatch<User>('user.getOrCreate', userId, { email, displayName });
  }

  async updateUserSettings(
    userId: string,
    settings: Partial<Pick<User, 'currency' | 'timezone' | 'displayName'>>
  ): Promise<User> {
    return this.dispatch<User>('user.updateSettings', userId, settings);
  }

  async purgeAllUserData(userId: string): Promise<{ success: boolean; deleted: Record<string, number> }> {
    return this.dispatch<{ success: boolean; deleted: Record<string, number> }>('user.purgeAllData', userId, {});
  }

  async listAccounts(userId: string): Promise<Account[]> {
    return this.dispatch<Account[]>('accounts.list', userId);
  }

  async createAccount(
    userId: string,
    data: Omit<Account, 'accountId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    return this.dispatch<Account>('accounts.create', userId, data as Record<string, unknown>);
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: Partial<Omit<Account, 'accountId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Account> {
    return this.dispatch<Account>('accounts.update', userId, { accountId, ...data } as Record<string, unknown>);
  }

  async deleteAccount(userId: string, accountId: string): Promise<{ success: boolean }> {
    return this.dispatch<{ success: boolean }>('accounts.delete', userId, { accountId });
  }

  async listCategories(userId: string): Promise<Category[]> {
    return this.dispatch<Category[]>('categories.list', userId);
  }

  async createCategory(
    userId: string,
    data: Omit<Category, 'categoryId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Category> {
    return this.dispatch<Category>('categories.create', userId, data as Record<string, unknown>);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    data: Partial<Omit<Category, 'categoryId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Category> {
    return this.dispatch<Category>('categories.update', userId, { categoryId, ...data } as Record<string, unknown>);
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean }> {
    return this.dispatch<{ success: boolean }>('categories.delete', userId, { categoryId });
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
    return this.dispatch<Transaction[]>('transactions.list', userId, (filters || {}) as Record<string, unknown>);
  }

  async createTransaction(
    userId: string,
    data: Omit<Transaction, 'transactionId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    return this.dispatch<Transaction>('transactions.create', userId, data as Record<string, unknown>);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    data: Partial<Omit<Transaction, 'transactionId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Transaction> {
    return this.dispatch<Transaction>('transactions.update', userId, { transactionId, ...data } as Record<string, unknown>);
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<{ success: boolean }> {
    return this.dispatch<{ success: boolean }>('transactions.delete', userId, { transactionId });
  }

  async listBudgets(userId: string, filters?: { year?: number; month?: number }): Promise<Budget[]> {
    return this.dispatch<Budget[]>('budgets.list', userId, (filters || {}) as Record<string, unknown>);
  }

  async upsertBudget(
    userId: string,
    data: Omit<Budget, 'budgetId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Budget> {
    return this.dispatch<Budget>('budgets.upsert', userId, data as Record<string, unknown>);
  }

  async deleteBudget(userId: string, budgetId: string): Promise<{ success: boolean }> {
    return this.dispatch<{ success: boolean }>('budgets.delete', userId, { budgetId });
  }

  async copyBudgets(
    userId: string,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number
  ): Promise<{ copied: number }> {
    return this.dispatch<{ copied: number }>('budgets.copy', userId, { fromYear, fromMonth, toYear, toMonth });
  }

  async listRecurring(userId: string): Promise<RecurringTransaction[]> {
    return this.dispatch<RecurringTransaction[]>('recurring.list', userId);
  }

  async createRecurring(
    userId: string,
    data: Omit<RecurringTransaction, 'recurringRuleId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringTransaction> {
    return this.dispatch<RecurringTransaction>('recurring.create', userId, data as Record<string, unknown>);
  }

  async updateRecurring(
    userId: string,
    recurringRuleId: string,
    data: Partial<Omit<RecurringTransaction, 'recurringRuleId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<RecurringTransaction> {
    return this.dispatch<RecurringTransaction>('recurring.update', userId, { recurringRuleId, ...data } as Record<string, unknown>);
  }

  async deleteRecurring(userId: string, recurringRuleId: string): Promise<{ success: boolean }> {
    return this.dispatch<{ success: boolean }>('recurring.delete', userId, { recurringRuleId });
  }

  async getDashboardSummary(userId: string, year: number, month: number): Promise<DashboardSummary> {
    const [accounts, categories, allTransactions, budgets] = await Promise.all([
      this.listAccounts(userId),
      this.listCategories(userId),
      this.listTransactions(userId),
      this.listBudgets(userId, { year, month }),
    ]);

    const user = await this.getOrCreateUser(userId, '', '');
    const currency = user.currency || 'PHP';
    const monthStr = String(month).padStart(2, '0');
    const startPrefix = `${year}-${monthStr}`;

    const catMap = new Map(categories.map((c) => [c.categoryId, c]));
    const accMap = new Map(accounts.map((a) => [a.accountId, a]));

    const monthTx = allTransactions.filter((t) => t.transactionDate.startsWith(startPrefix));

    let totalIncomeMinor = 0;
    let totalExpenseMinor = 0;
    const categorySpendMap = new Map<string, number>();

    for (const tx of monthTx) {
      if (tx.type === 'income') {
        totalIncomeMinor = addMinor(totalIncomeMinor, tx.amountMinor);
      } else if (tx.type === 'expense') {
        totalExpenseMinor = addMinor(totalExpenseMinor, tx.amountMinor);
        const curr = categorySpendMap.get(tx.categoryId) || 0;
        categorySpendMap.set(tx.categoryId, addMinor(curr, tx.amountMinor));
      }
    }

    const netSavingsMinor = calculateSavings(totalIncomeMinor, totalExpenseMinor);

    let totalBudgetMinor = 0;
    const catBudgetMap = new Map<string, number>();
    for (const b of budgets) {
      totalBudgetMinor = addMinor(totalBudgetMinor, b.amountMinor);
      if (b.categoryId) catBudgetMap.set(b.categoryId, b.amountMinor);
    }

    const remainingBudgetMinor = subtractMinor(totalBudgetMinor, totalExpenseMinor);
    const budgetUtilizationPercent = calculateUtilization(totalExpenseMinor, totalBudgetMinor);

    const categorySpendBreakdown = Array.from(categorySpendMap.entries()).map(([catId, spentMinor]) => {
      const cat = catMap.get(catId);
      const budgetForCat = catBudgetMap.get(catId) || 0;
      return {
        categoryId: catId,
        categoryName: cat?.name || 'Uncategorized',
        color: cat?.color || '#6B7280',
        icon: cat?.icon || 'Tag',
        spentMinor,
        percentage: calculatePercentage(spentMinor, totalExpenseMinor),
        budgetMinor: budgetForCat,
        utilizationPercent: calculateUtilization(spentMinor, budgetForCat),
        isOverBudget: budgetForCat > 0 && spentMinor > budgetForCat,
      };
    }).sort((a, b) => b.spentMinor - a.spentMinor);

    const recentTransactions = monthTx.slice(0, 5).map((t) => ({
      ...t,
      categoryName: catMap.get(t.categoryId)?.name || 'Uncategorized',
      accountName: accMap.get(t.accountId)?.name || 'Account',
    }));

    const spendingTrends = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(year, month - 1 - i, 1);
      const tYear = targetDate.getFullYear();
      const tMonth = targetDate.getMonth() + 1;
      const tPrefix = `${tYear}-${String(tMonth).padStart(2, '0')}`;
      const label = targetDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      let tIncome = 0;
      let tExpense = 0;
      for (const tx of allTransactions) {
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
