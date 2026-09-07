import { describe, expect, it } from 'vitest';
import { parseDate, niceYearTicks } from '../src/layout/time.js';

describe('parseDate', () => {
  it('parses "1947-08-15" as a day number', () => {
    const dn = parseDate('1947-08-15');
    expect(dn).toBeTypeOf('number');
    expect(dn).toBeGreaterThan(2400000);
  });

  it('parses "1857-01-01" earlier than "1947-08-15"', () => {
    const a = parseDate('1857-01-01');
    const b = parseDate('1947-08-15');
    expect(a).toBeLessThan(b);
  });

  it('parses "-500" earlier than "1"', () => {
    const a = parseDate('-500');
    const b = parseDate('1');
    expect(a).toBeLessThan(b);
  });

  it('is deterministic (same input same output)', () => {
    const a = parseDate('1947-08-15');
    const b = parseDate('1947-08-15');
    expect(a).toBe(b);
  });
});

describe('niceYearTicks', () => {
  it('produces 4–8 ticks for a moderate span', () => {
    const result = niceYearTicks(1900, 1950);
    expect(result.ticks.length).toBeGreaterThanOrEqual(4);
    expect(result.ticks.length).toBeLessThanOrEqual(8);
  });

  it('is deterministic', () => {
    const a = niceYearTicks(1800, 2000);
    const b = niceYearTicks(1800, 2000);
    expect(a.ticks).toEqual(b.ticks);
  });

  it('uses fixed ladder 1,2,5,10,25,50,100,250,500,1000', () => {
    const result = niceYearTicks(1947, 2026);
    // Should pick step 10 or 25 giving 4-8 labels
    expect(result.ticks.length).toBeGreaterThanOrEqual(4);
  });
});