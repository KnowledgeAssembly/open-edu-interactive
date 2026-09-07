export interface Point { x: number; y: number; }
export interface Size { width: number; height: number; }
export interface Rect { x: number; y: number; width: number; height: number; }

export function point(x: number, y: number): Point {
  return { x, y };
}

export function size(w: number, h: number): Size {
  return { width: w, height: h };
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, width: w, height: h };
}

export function union(bounds: Rect[]): Rect {
  if (bounds.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of bounds) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function contained(bounds: Rect, container: Rect): boolean {
  return bounds.x >= container.x
    && bounds.y >= container.y
    && bounds.x + bounds.width <= container.x + container.width
    && bounds.y + bounds.height <= container.y + container.height;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function translate(r: Rect, dx: number, dy: number): Rect {
  return { x: r.x + dx, y: r.y + dy, width: r.width, height: r.height };
}