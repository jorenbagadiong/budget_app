/**
 * Financial Calculation Engine using Integer Minor Units (Centavos / Cents).
 * Prevents IEEE 754 binary floating-point rounding errors.
 */

/**
 * Converts a decimal monetary amount (e.g. 100.50 or "100.50") to integer minor units (10050).
 * Uses string parsing to prevent float multiplication artifacts (e.g., 19.99 * 100 = 1998.9999999999998).
 */
export function toMinorUnits(value: number | string, decimals = 2): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const str = String(value).trim().replace(/,/g, '');
  if (!/^-?\d*(\.\d+)?$/.test(str) || str === '-' || str === '.') {
    return 0;
  }

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;

  const parts = cleanStr.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

  const wholeInt = parseInt(whole, 10);
  const fracInt = parseInt(frac, 10);

  if (isNaN(wholeInt) || isNaN(fracInt)) {
    return 0;
  }

  const result = wholeInt * Math.pow(10, decimals) + fracInt;
  return isNegative ? -result : result;
}

/**
 * Converts minor units (e.g. 10050 centavos) to a decimal number (100.50).
 */
export function fromMinorUnits(minorUnits: number, decimals = 2): number {
  if (!Number.isFinite(minorUnits)) return 0;
  return Number((minorUnits / Math.pow(10, decimals)).toFixed(decimals));
}

/**
 * Formats minor units into localized currency string (e.g. ₱1,250.50).
 */
export function formatCurrency(
  minorUnits: number,
  currency = 'PHP',
  locale = 'en-PH'
): string {
  const decimalValue = fromMinorUnits(minorUnits);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(decimalValue);
  } catch {
    // Fallback if locale or currency code is unsupported
    const sign = minorUnits < 0 ? '-' : '';
    const absVal = Math.abs(decimalValue).toFixed(2);
    return `${sign}${currency} ${absVal}`;
  }
}

/**
 * Safe addition of minor units
 */
export function addMinor(a: number, b: number): number {
  return Math.trunc(a) + Math.trunc(b);
}

/**
 * Safe subtraction of minor units
 */
export function subtractMinor(a: number, b: number): number {
  return Math.trunc(a) - Math.trunc(b);
}

/**
 * Calculates budget utilization as a percentage (0 to 100+).
 * Returns 0 if budget is 0 or negative.
 */
export function calculateUtilization(spentMinor: number, budgetMinor: number): number {
  if (!budgetMinor || budgetMinor <= 0) return 0;
  const ratio = (spentMinor / budgetMinor) * 100;
  return Math.round(ratio * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculates net savings (Income - Expenses)
 */
export function calculateSavings(incomeMinor: number, expenseMinor: number): number {
  return subtractMinor(incomeMinor, expenseMinor);
}

/**
 * Calculates percentage of a component in a total (0 to 100).
 */
export function calculatePercentage(partMinor: number, totalMinor: number): number {
  if (!totalMinor || totalMinor <= 0) return 0;
  const ratio = (partMinor / totalMinor) * 100;
  return Math.round(ratio * 10) / 10;
}
