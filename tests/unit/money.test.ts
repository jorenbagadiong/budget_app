import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  fromMinorUnits,
  formatCurrency,
  addMinor,
  subtractMinor,
  calculateUtilization,
  calculateSavings,
  calculatePercentage,
} from '@/lib/math/money';

describe('Financial Math Engine (Minor Units)', () => {
  it('converts decimal amounts to minor units without float errors', () => {
    // Classic IEEE 754 float trap: 19.99 * 100 = 1998.9999999999998
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits('19.99')).toBe(1999);
    expect(toMinorUnits(100.5)).toBe(10050);
    expect(toMinorUnits('100.50')).toBe(10050);
    expect(toMinorUnits('1,250.75')).toBe(125075);
    expect(toMinorUnits(0)).toBe(0);
    expect(toMinorUnits('')).toBe(0);
  });

  it('converts minor units back to decimal accurately', () => {
    expect(fromMinorUnits(1999)).toBe(19.99);
    expect(fromMinorUnits(10050)).toBe(100.5);
    expect(fromMinorUnits(0)).toBe(0);
  });

  it('formats minor units to currency string for PHP', () => {
    const formatted = formatCurrency(1250000, 'PHP');
    // Expect ₱12,500.00 or PHP 12,500.00
    expect(formatted).toMatch(/(₱|PHP)\s?12,500\.00/);
  });

  it('performs safe addition and subtraction', () => {
    expect(addMinor(10050, 5025)).toBe(15075);
    expect(subtractMinor(15075, 5025)).toBe(10050);
    expect(calculateSavings(2500000, 1800000)).toBe(700000);
  });

  it('calculates budget utilization accurately', () => {
    // 8,500 / 10,000 = 85.0%
    expect(calculateUtilization(850000, 1000000)).toBe(85);
    // 12,000 / 10,000 = 120.0% (Over budget)
    expect(calculateUtilization(1200000, 1000000)).toBe(120);
    // Zero budget handling
    expect(calculateUtilization(5000, 0)).toBe(0);
  });

  it('calculates percentage of total', () => {
    expect(calculatePercentage(3000, 10000)).toBe(30);
    expect(calculatePercentage(0, 10000)).toBe(0);
    expect(calculatePercentage(500, 0)).toBe(0);
  });
});
