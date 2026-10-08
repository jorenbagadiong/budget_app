import { z } from 'zod';

// Formula injection sanitizer (strips or neutralizes leading '=', '+', '-', '@', '\t', '\r')
export function sanitizeFormulaString(val: string): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^[\=\+\-\@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const AccountCreateSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(50),
  type: z.enum(['cash', 'bank', 'ewallet', 'credit_card']),
  currency: z.string().length(3).toUpperCase().default('PHP'),
  initialBalanceMinor: z.number().int().default(0),
});

export const AccountUpdateSchema = AccountCreateSchema.partial().extend({
  accountId: z.string().min(1),
});

export const CategoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(50),
  type: z.enum(['income', 'expense']),
  icon: z.string().default('Tag'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #EF4444)')
    .default('#6B7280'),
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial().extend({
  categoryId: z.string().min(1),
});

export const TransactionCreateSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amountMinor: z.number().int().positive('Amount must be a positive integer in minor units'),
  currency: z.string().length(3).toUpperCase().default('PHP'),
  categoryId: z.string().optional().default(''),
  description: z.string().max(255).default('').transform(sanitizeFormulaString),
  transactionDate: DateStringSchema,
  isRecurring: z.boolean().default(false),
  recurringRuleId: z.string().optional(),
});

export const TransactionUpdateSchema = TransactionCreateSchema.partial().extend({
  transactionId: z.string().min(1),
});

export const BudgetUpsertSchema = z.object({
  period: z.enum(['monthly', 'yearly']).default('monthly'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).nullable().optional(),
  categoryId: z.string().optional().default(''),
  amountMinor: z.number().int().nonnegative('Budget amount cannot be negative'),
  currency: z.string().length(3).toUpperCase().default('PHP'),
});

export const BudgetCopySchema = z.object({
  fromYear: z.number().int().min(2000).max(2100),
  fromMonth: z.number().int().min(1).max(12),
  toYear: z.number().int().min(2000).max(2100),
  toMonth: z.number().int().min(1).max(12),
});

export const RecurringCreateSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional().default(''),
  type: z.enum(['income', 'expense', 'transfer']),
  amountMinor: z.number().int().positive('Amount must be positive'),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
  nextExecutionDate: DateStringSchema,
  description: z.string().max(255).default('').transform(sanitizeFormulaString),
  active: z.boolean().default(true),
});

export const UserSettingsUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  timezone: z.string().min(1).max(50).optional(),
});

// Explicitly ensure malicious or client-injected userId is rejected / discarded
export type ValidatedTransactionCreate = z.infer<typeof TransactionCreateSchema>;
export type ValidatedBudgetUpsert = z.infer<typeof BudgetUpsertSchema>;
