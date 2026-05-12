import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../lib/formatting';

describe('formatCurrency', () => {
  it('formats positive amounts with a dollar sign', () => {
    expect(formatCurrency(120000)).toBe('$1,200.00');
  });

  it('formats negative amounts with the sign before the dollar sign', () => {
    expect(formatCurrency(-120000)).toBe('-$1,200.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('includes fractional cents', () => {
    expect(formatCurrency(4523)).toBe('$45.23');
    expect(formatCurrency(-4523)).toBe('-$45.23');
  });
});
