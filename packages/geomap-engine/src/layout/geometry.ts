export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

export function union(...rects: Rect[]): Rect {
  const xs = rects.flatMap((r) => [r.x, r.x + r.width]);
  const ys = rects.flatMap((r) => [r.y, r.y + r.height]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return rect(minX, minY, maxX - minX, maxY - minY);
}

export function translate(r: Rect, dx: number, dy: number): Rect {
  return rect(r.x + dx, r.y + dy, r.width, r.height);
}

export function contained(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function ringSignedArea(ring: Point[]): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentProperlyCrosses(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1 = orientation(a1, a2, b1);
  const d2 = orientation(a1, a2, b2);
  const d3 = orientation(b1, b2, a1);
  const d4 = orientation(b1, b2, a2);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

function pointOnBoundary(p: Point, ring: Point[]): boolean {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j]!;
    const b = ring[i]!;
    if (orientation(a, b, p) !== 0) continue;
    if (p.x >= Math.min(a.x, b.x) - 1e-9 && p.x <= Math.max(a.x, b.x) + 1e-9 && p.y >= Math.min(a.y, b.y) - 1e-9 && p.y <= Math.max(a.y, b.y) + 1e-9) {
      return true;
    }
  }
  return false;
}

function strictlyInside(p: Point, ring: Point[]): boolean {
  if (pointOnBoundary(p, ring)) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ai = ring[i]!;
    const aj = ring[j]!;
    const xi = ai.x;
    const yi = ai.y;
    const xj = aj.x;
    const yj = aj.y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonArea(ring: Point[]): number {
  if (ring.length < 3) return 0;
  return Math.abs(ringSignedArea(ring));
}

export function polygonsOverlap(ringA: Point[], ringB: Point[]): boolean {
  if (ringA.length < 3 || ringB.length < 3) return false;
  for (let i = 0, j = ringA.length - 1; i < ringA.length; j = i++) {
    for (let k = 0, l = ringB.length - 1; k < ringB.length; l = k++) {
      if (segmentProperlyCrosses(ringA[j]!, ringA[i]!, ringB[l]!, ringB[k]!)) return true;
    }
  }
  for (const v of ringA) {
    if (strictlyInside(v, ringB)) return true;
  }
  for (const v of ringB) {
    if (strictlyInside(v, ringA)) return true;
  }
  return false;
}

export function regionsOverlap(ringsA: Point[][], ringsB: Point[][]): boolean {
  for (const ringA of ringsA) {
    for (const ringB of ringsB) {
      if (polygonsOverlap(ringA, ringB)) return true;
    }
  }
  return false;
}

export function polygonCentroid(coords: number[][]): Point {
  let x = 0;
  let y = 0;
  const n = coords.length;
  if (n === 0) return { x: 0, y: 0 };
  for (const c of coords) {
    x += c[0] ?? 0;
    y += c[1] ?? 0;
  }
  return { x: x / n, y: y / n };
}

export function pointInPolygon(point: Point, polygon: number[][]): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]![0]!;
    const yi = polygon[i]![1]!;
    const xj = polygon[j]![0]!;
    const yj = polygon[j]![1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}