export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

export function isValidCalendarDate(dateString: string): boolean {
  const neg = dateString.startsWith('-');
  const body = neg ? dateString.slice(1) : dateString;
  const parts = body.split('-');
  const year = Number(parts[0] ?? 0) * (neg ? -1 : 1);
  if (!Number.isInteger(year)) return false;
  if (parts.length === 1) return true;
  const month = Number(parts[1]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (parts.length === 2) return true;
  const day = Number(parts[2]);
  return Number.isInteger(day) && day >= 1 && day <= daysInMonth(year, month);
}

export const JDN_0001_01_01 = 1721426;

export function prolepticGregorianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function parseDate(dateString: string): number {
  const neg = dateString.startsWith('-');
  const parts = (neg ? dateString.slice(1) : dateString).split('-').map(Number);
  let year = parts[0] ?? 0;
  if (neg) year = -year;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return prolepticGregorianDayNumber(year, month, day);
}

export function yearOf(civilDay: number): number {
  let y = Math.round((civilDay - JDN_0001_01_01) / 365.2425) + 1;
  while (prolepticGregorianDayNumber(y, 1, 1) > civilDay) {
    y -= 1;
  }
  while (prolepticGregorianDayNumber(y + 1, 1, 1) <= civilDay) {
    y += 1;
  }
  return y;
}

export function timeScale(domain: [number, number], range: [number, number]): {
  (d: number): number;
  invert: (x: number) => number;
  domain: [number, number];
  range: [number, number];
} {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const scale = d1 - d0 === 0 ? 0 : (r1 - r0) / (d1 - d0);
  const fn = (d: number): number => r0 + (d - d0) * scale;
  fn.invert = (x: number): number => d0 + (x - r0) / (scale || 1);
  return fn as ReturnType<typeof timeScale>;
}

const TICK_LADDER = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];

export function niceYearTicks(
  d0: number,
  d1: number,
): { ticks: number[]; domain: [number, number] } {
  const span = d1 - d0;
  if (span <= 0) return { ticks: [d0], domain: [d0, d0 + 1] };

  let bestStep = 1;
  for (const step of TICK_LADDER) {
    const count = Math.ceil(span / step);
    if (count >= 4 && count <= 8) {
      bestStep = step;
      break;
    }
    if (count < 4) {
      bestStep = step;
      break;
    }
    bestStep = step;
  }

  const step = bestStep;
  const start = Math.floor(d0 / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= d1; t += step) {
    if (t >= d0) ticks.push(t);
  }
  if (ticks.length === 0) ticks.push(d0);

  const domain: [number, number] =
    ticks.length >= 2 ? [ticks[0]!, ticks[ticks.length - 1]!] : [d0, d0 + 1];

  return { ticks, domain };
}