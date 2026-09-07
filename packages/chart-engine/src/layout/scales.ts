export interface LinearScale {
  (v: number): number;
  invert(p: number): number;
  domain: [number, number];
  range: [number, number];
}

export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const ratio = (r1 - r0) / span;
  const scale = ((v: number) => r0 + (v - d0) * ratio) as LinearScale;
  scale.invert = (p: number) => d0 + (p - r0) / ratio;
  scale.domain = domain;
  scale.range = range;
  return scale;
}

export function bandScale(categories: string[], range: [number, number]): {
  (cat: string): number;
  bandwidth(): number;
  domain: string[];
} {
  const [r0, r1] = range;
  const n = categories.length || 1;
  const total = r1 - r0;
  const gap = total * 0.1;
  const band = (total - gap) / n;

  const scale = ((cat: string) => {
    const idx = categories.indexOf(cat);
    if (idx === -1) return r0;
    return r0 + gap / 2 + idx * band;
  }) as { (cat: string): number; bandwidth(): number; domain: string[] };

  scale.bandwidth = () => band;
  scale.domain = categories;
  return scale;
}

const TICK_STEPS = [1, 2, 2.5, 5, 10] as const;

export function niceTicks(
  rawMin: number,
  rawMax: number,
  target: number = 5,
): { ticks: number[]; domain: [number, number] } {
  if (rawMax <= rawMin) {
    const adjusted = rawMax === rawMin ? rawMax + 1 : rawMax;
    return niceTicks(Math.min(rawMin, adjusted), Math.max(rawMin, adjusted), target);
  }

  const span = rawMax - rawMin;
  const roughStep = span / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));

  let stepSize = magnitude * TICK_STEPS[0];
  for (const s of TICK_STEPS) {
    if (s * magnitude >= roughStep) {
      stepSize = s * magnitude;
      break;
    }
  }

  const lo = Math.floor(rawMin / stepSize) * stepSize;
  const hi = Math.ceil(rawMax / stepSize) * stepSize;

  const ticks: number[] = [];
  for (let v = lo; v <= hi + stepSize * 0.001; v += stepSize) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }

  return { ticks, domain: [lo, hi] as [number, number] };
}

export function barDomain(values: number[]): [number, number] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return [min, max];
}

export function lineDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || 1;
  return [min - pad, max + pad];
}