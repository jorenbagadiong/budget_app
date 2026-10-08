export type AccountType = 'cash' | 'bank' | 'ewallet' | 'credit_card';

export type CategoryType = 'income' | 'expense';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type BudgetPeriod = 'monthly' | 'yearly';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface User {
  userId: string; // Immutable Google sub ID
  email: string;
  displayName: string;
  currency: string; // ISO 4217, default 'PHP'
  timezone: string; // IANA timezone, default 'Asia/Manila'
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  accountId: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalanceMinor: number; // e.g., 100000 = ₱1,000.00
  currentBalanceMinor?: number; // Computed on server/read
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  categoryId: string;
  userId: string; // 'SYSTEM' or specific userId
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  accountId: string;
  toAccountId?: string; // Target account for transfers
  type: TransactionType;
  amountMinor: number; // Non-negative integer in minor units
  currency: string;
  categoryId: string;
  description: string;
  transactionDate: string; // YYYY-MM-DD
  isRecurring: boolean;
  recurringRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  budgetId: string;
  userId: string;
  period: BudgetPeriod;
  year: number;
  month: number | null; // 1-12 for monthly, null for yearly
  categoryId: string; // Associated category or empty/overall
  amountMinor: number; // Non-negative integer minor units
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransaction {
  recurringRuleId: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  frequency: RecurringFrequency;
  nextExecutionDate: string; // YYYY-MM-DD
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySpendBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  spentMinor: number;
  percentage: number; // 0 to 100
  budgetMinor: number;
  utilizationPercent: number; // e.g. 85.5%
  isOverBudget: boolean;
}

export interface SpendingTrendPoint {
  label: string; // e.g. "May 2026" or "2026-05"
  incomeMinor: number;
  expenseMinor: number;
  savingsMinor: number;
}

export interface DashboardSummary {
  year: number;
  month: number;
  currency: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netSavingsMinor: number;
  totalBudgetMinor: number;
  remainingBudgetMinor: number;
  budgetUtilizationPercent: number;
  transactionCount: number;
  categorySpendBreakdown: CategorySpendBreakdown[];
  recentTransactions: (Transaction & { categoryName?: string; accountName?: string })[];
  spendingTrends: SpendingTrendPoint[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SessionUser {
  id: string; // Google sub
  email: string;
  name: string;
  image?: string;
}
