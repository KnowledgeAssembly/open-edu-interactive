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