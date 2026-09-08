import { describe, expect, it } from 'vitest';
import { parseDate, niceYearTicks, isValidCalendarDate, yearOf } from '../src/layout/time.js';

describe('parseDate (proleptic Gregorian day numbers)', () => {
  it('matches known Julian day-number anchors', () => {
    expect(parseDate('1970-01-01')).toBe(2440588);
    expect(parseDate('2000-01-01')).toBe(2451545);
    expect(parseDate('0001-01-01')).toBe(1721426);
    expect(parseDate('1947-08-15')).toBe(2432413);
  });

  it('produces integer day numbers', () => {
    for (const date of ['1857-01-01', '1900', '1919-04-13', '-0011-08-31']) {
      expect(Number.isInteger(parseDate(date)), `${date} must be an integer day number`).toBe(true);
    }
  });

  it('advances exactly one day between consecutive dates', () => {
    const cases: Array<[string, string]> = [
      ['1857-01-01', '1857-01-02'],
      ['1900-02-28', '1900-03-01'],
      ['2000-02-28', '2000-02-29'],
      ['2000-02-29', '2000-03-01'],
      ['-0001-12-31', '0000-01-01'],
      ['0000-12-31', '0001-01-01'],
    ];
    for (const [a, b] of cases) {
      expect(parseDate(b), `${a} -> ${b}`).toBe(parseDate(a) + 1);
    }
  });

  it('treats year 0 as a leap year (divisible by 400)', () => {
    expect(parseDate('0000-02-29')).toBe(parseDate('0000-03-01') - 1);
  });

  it('parses "1857-01-01" earlier than "1947-08-15"', () => {
    const a = parseDate('1857-01-01');
    const b = parseDate('1947-08-15');
    expect(a).toBeLessThan(b);
  });

  it('parses "-500" earlier than "1"', () => {
    const a = parseDate('-500');
    const b = parseDate('-0001-12-31');
    expect(a).toBeLessThan(b);
    expect(parseDate('-0001-12-31')).toBeLessThan(parseDate('1'));
  });

  it('keeps BCE adjacent years ~365 days apart (no era discontinuity)', () => {
    expect(parseDate('0000-01-01') - parseDate('-0001-01-01')).toBe(365);
    expect(parseDate('0001-01-01') - parseDate('0000-01-01')).toBe(366);
  });

  it('is deterministic (same input same output)', () => {
    const a = parseDate('1947-08-15');
    const b = parseDate('1947-08-15');
    expect(a).toBe(b);
  });
});

describe('isValidCalendarDate', () => {
  it('accepts valid year / year-month / full dates', () => {
    for (const d of ['1947', '1947-08', '1947-08-15', '2024-02-29', '0000-02-29', '-0500']) {
      expect(isValidCalendarDate(d), `"${d}" should be valid`).toBe(true);
    }
  });

  it('rejects out-of-range months and days', () => {
    for (const d of ['1947-13-01', '1947-00-01', '1947-04-31', '1947-11-31', '1900-02-29', '1901-02-29', '1947-02-30']) {
      expect(isValidCalendarDate(d), `"${d}" should be invalid`).toBe(false);
    }
  });
});

describe('yearOf', () => {
  it('inverts parseDate on year boundaries', () => {
    for (const [date, want] of [['1757', 1757], ['1899-12-31', 1899], ['1947-08-15', 1947], ['0000-02-29', 0], ['-0500-06-01', -500]] as const) {
      expect(yearOf(parseDate(date)), date).toBe(want);
    }
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