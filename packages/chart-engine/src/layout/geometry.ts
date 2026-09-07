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

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function contained(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
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