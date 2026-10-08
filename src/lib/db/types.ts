import type {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  RecurringTransaction,
  DashboardSummary,
} from '@/types';

export interface IBudgetStorage {
  // User Management
  getOrCreateUser(userId: string, email: string, displayName: string): Promise<User>;
  updateUserSettings(userId: string, settings: Partial<Pick<User, 'currency' | 'timezone' | 'displayName'>>): Promise<User>;
  purgeAllUserData(userId: string): Promise<{ success: boolean; deleted: Record<string, number> }>;

  // Accounts
  listAccounts(userId: string): Promise<Account[]>;
  createAccount(userId: string, data: Omit<Account, 'accountId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Account>;
  updateAccount(userId: string, accountId: string, data: Partial<Omit<Account, 'accountId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Account>;
  deleteAccount(userId: string, accountId: string): Promise<{ success: boolean }>;

  // Categories
  listCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, data: Omit<Category, 'categoryId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  updateCategory(userId: string, categoryId: string, data: Partial<Omit<Category, 'categoryId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Category>;
  deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean }>;

  // Transactions
  listTransactions(userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    accountId?: string;
    categoryId?: string;
    type?: string;
  }): Promise<Transaction[]>;
  createTransaction(userId: string, data: Omit<Transaction, 'transactionId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  updateTransaction(userId: string, transactionId: string, data: Partial<Omit<Transaction, 'transactionId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Transaction>;
  deleteTransaction(userId: string, transactionId: string): Promise<{ success: boolean }>;

  // Budgets
  listBudgets(userId: string, filters?: { year?: number; month?: number }): Promise<Budget[]>;
  upsertBudget(userId: string, data: Omit<Budget, 'budgetId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Budget>;
  deleteBudget(userId: string, budgetId: string): Promise<{ success: boolean }>;
  copyBudgets(userId: string, fromYear: number, fromMonth: number, toYear: number, toMonth: number): Promise<{ copied: number }>;

  // Recurring Rules
  listRecurring(userId: string): Promise<RecurringTransaction[]>;
  createRecurring(userId: string, data: Omit<RecurringTransaction, 'recurringRuleId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<RecurringTransaction>;
  updateRecurring(userId: string, recurringRuleId: string, data: Partial<Omit<RecurringTransaction, 'recurringRuleId' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<RecurringTransaction>;
  deleteRecurring(userId: string, recurringRuleId: string): Promise<{ success: boolean }>;

  // Dashboard Aggregates
  getDashboardSummary(userId: string, year: number, month: number): Promise<DashboardSummary>;
}
