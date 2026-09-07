export function parseDate(dateString: string): number {
  const neg = dateString.startsWith('-');
  const parts = (neg ? dateString.slice(1) : dateString).split('-').map(Number);
  let year = parts[0] ?? 0;
  if (neg) year = -year;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return prolepticGregorianDayNumber(year, month, day);
}

function prolepticGregorianDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const m = month <= 2 ? month + 12 : month;
  const era = y >= 0 ? y : y - 3999;
  const e = Math.floor(era / 400);
  const f = era - e * 400;
  const jd = Math.floor(365.25 * f) - Math.floor(f / 100) + Math.floor(f / 4) + day + (153 * m + 2) / 5 + 1721119 + e * 146097;
  return jd;
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