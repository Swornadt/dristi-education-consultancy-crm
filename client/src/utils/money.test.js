import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

// Exact output depends on the machine's locale, so these check behaviour rather than the string.
describe('formatMoney', () => {
  it('treats numeric strings like numbers', () => {
    expect(formatMoney('12.5')).toBe(formatMoney(12.5));
  });
  it('shows zero for null, undefined and junk instead of NaN', () => {
    const zero = formatMoney(0);
    expect(formatMoney(null)).toBe(zero);
    expect(formatMoney(undefined)).toBe(zero);
    expect(formatMoney('abc')).toBe(zero);
    expect(formatMoney(NaN)).not.toMatch(/NaN/);
  });
  it('keeps two decimals', () => {
    expect(formatMoney(5)).toMatch(/5[.,]00/);
  });
  it('formats negatives distinctly from positives', () => {
    expect(formatMoney(-40)).not.toBe(formatMoney(40));
  });
});
