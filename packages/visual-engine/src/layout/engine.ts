import type { Scene, SceneNode, Bounds } from '../scene/types.js';
import type { LayoutContext } from './types.js';
import { rect } from './geometry.js';

interface Scale {
  min: number;
  max: number;
  step: number;
  direction: 'horizontal' | 'vertical';
}

interface Point { x: number; y: number; }

export function layout(scene: Scene, ctx: LayoutContext): Scene {
  const geometryNodes = scene.nodes.filter((n) => n.kind === 'geometry');
  if (geometryNodes.length > 1) {
    for (let i = 0; i < geometryNodes.length; i++) {
      layoutGeometry(geometryNodes[i]!, ctx, { index: i, total: geometryNodes.length });
    }
  }

  for (const node of scene.nodes) {
    switch (node.kind) {
      case 'number-line':
        layoutNumberLine(node, ctx);
        break;
      case 'counting-set':
        layoutCountingSet(node, ctx);
        break;
      case 'fraction':
        layoutFraction(node, ctx);
        break;
      case 'fraction-circle':
        layoutFractionCircle(node, ctx);
        break;
      case 'fraction-comparison':
      case 'comparison':
        layoutComparison(node, ctx);
        break;
      case 'clock':
        layoutClock(node, ctx);
        break;
      case 'coordinate-grid':
        layoutCoordinateGrid(node, ctx);
        break;
      case 'geometry':
        if (geometryNodes.length <= 1) {
          layoutGeometry(node, ctx);
        }
        break;
      case 'illustration':
        layoutIllustration(node, ctx);
        break;
      default:
        break;
    }
  }
  return scene;
}

function setBounds(node: SceneNode, b: Bounds): void {
  node.bounds = b;
}

function polar(cx: number, cy: number, r: number, angleDegrees: number): Point {
  const rad = (angleDegrees * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function layoutNumberLine(node: SceneNode, ctx: LayoutContext): void {
  const pad = 20;
  const axisX = pad;
  const axisWidth = ctx.width - pad * 2;
  const baselineY = Math.round(ctx.height / 2);

  const axis = node.children.find(c => c.role === 'axis');
  if (!axis) return;
  const scale = axis.metadata?.scale as Scale | undefined;
  if (!scale) return;

  const vertical = scale.direction === 'vertical';

  axis.bounds = vertical
    ? rect(axisX - 2, pad, 4, ctx.height - pad * 2)
    : rect(axisX, baselineY - 2, axisWidth, 4);

  const span = scale.max - scale.min || 1;
  const usable = vertical ? ctx.height - pad * 2 : axisWidth;

  for (const child of node.children) {
    if (child === axis || typeof child.value !== 'number') continue;
    if (child.value < scale.min || child.value > scale.max) continue;

    const t = (child.value - scale.min) / span;
    const pos = vertical ? pad + t * usable : axisX + t * usable;
    const cy = vertical ? pos : baselineY;
    const cx = vertical ? axisX : pos;

    switch (child.role) {
      case 'tick': {
        child.bounds = vertical
          ? rect(cx - 6, cy - 1, 12, 2)
          : rect(cx - 1, cy - 6, 2, 12);
        break;
      }
      case 'number': {
        const w = 28;
        const h = 18;
        child.bounds = vertical
          ? rect(cx + 12, cy - h / 2, w, h)
          : rect(cx - w / 2, cy + 14, w, h);
        break;
      }
      case 'marker': {
        const size = child.interactive ? Math.max(ctx.minTouchTarget, 16) : 14;
        child.bounds = rect(cx - size / 2, cy - size / 2, size, size);
        break;
      }
      default:
        break;
    }
  }
}

function layoutCountingSet(node: SceneNode, ctx: LayoutContext): void {
  const children = node.children;
  const count = children.length;
  if (count === 0) return;

  const meta = children[0]?.metadata as { arrangement?: string; rows?: number; columns?: number } | undefined;
  const arrangement = meta?.arrangement ?? 'grid';
  const maxSize = Math.min(ctx.width, ctx.height) * 0.6;
  const touch = Math.max(ctx.minTouchTarget, 24);

  let cols: number;
  let rows: number;
  if (arrangement === 'row') {
    cols = count;
    rows = 1;
  } else if (arrangement === 'column') {
    cols = 1;
    rows = count;
  } else {
    cols = meta?.columns ?? Math.ceil(Math.sqrt(count));
    rows = meta?.rows ?? Math.ceil(count / cols);
  }

  const cellW = Math.min(maxSize / cols, (ctx.width - 40) / cols);
  const cellH = Math.min(maxSize / rows, (ctx.height - 60) / rows);
  const size = Math.max(10, Math.min(cellW, cellH, touch));
  const gapY = size + 6;
  const gapX = size + 6;

  const totalW = cols * gapX - 6;
  const totalH = rows * gapY - 6;
  const startX = (ctx.width - totalW) / 2;
  const startY = (ctx.height - totalH) / 2;

  for (let i = 0; i < count; i++) {
    const child = children[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (arrangement === 'column') {
      setBounds(child, rect(startX + (cols - 1) * gapX / 2, startY + row * gapY, size, size));
    } else {
      setBounds(child, rect(startX + col * gapX, startY + row * gapY, size, size));
    }
  }
}

function layoutFraction(node: SceneNode, ctx: LayoutContext): void {
  const bar = node.children.find(c => c.kind === 'fraction-bar') ?? node.children.find(c => c.role === 'group');
  const label = node.children.find(c => c.role === 'label');

  if (!bar) return;

  const pad = 40;
  const barW = ctx.width - pad * 2;
  const barH = 48;
  const barY = Math.round(ctx.height / 2) - barH / 2;

  setBounds(bar, rect(pad, barY, barW, barH));

  const parts = bar.children;
  const n = parts.length || 1;
  const partW = barW / n;
  for (let i = 0; i < parts.length; i++) {
    setBounds(parts[i]!, rect(pad + i * partW, barY, partW, barH));
  }

  if (label) {
    setBounds(label, rect(pad, barY + barH + 12, 200, 24));
  }
}

function layoutFractionCircle(node: SceneNode, ctx: LayoutContext): void {
  const group = node.children.find(c => c.kind === 'fraction-circle') ?? node;
  const sectors = group.children.filter(c => c.kind === 'wedge');
  if (sectors.length === 0) return;

  const cx = ctx.width / 2;
  const cy = Math.round(ctx.height / 2);
  const r = Math.min(ctx.width, ctx.height) * 0.35;
  const n = sectors.length;
  const span = 360 / n;

  for (let i = 0; i < n; i++) {
    const startAngle = -90 + i * span;
    const endAngle = startAngle + span;
    sectors[i]!.bounds = rect(cx - r, cy - r, 2 * r, 2 * r);
    sectors[i]!.metadata = { ...sectors[i]!.metadata, startAngle, endAngle, cx, cy, r };
  }

  const label = node.children.find(c => c.role === 'label');
  if (label) {
    setBounds(label, rect(cx - 50, cy + r + 12, 100, 24));
  }
}

function layoutComparison(node: SceneNode, ctx: LayoutContext): void {
  const children = node.children;
  const items = children.filter(c => c.role === 'selectable' || c.role === 'visual');
  const operator = children.find(c => c.role === 'label' && c.metadata?.comparison);

  const pad = 40;
  const availW = ctx.width - pad * 2;
  const itemW = Math.min(availW * 0.38, 260);
  const opW = availW - itemW * 2;
  const gap = opW;
  const centerY = Math.round(ctx.height / 2);

  if (items[0]) {
    layoutItemGroup(items[0]!, pad, centerY, itemW);
  }
  if (items[1]) {
    layoutItemGroup(items[1]!, pad + itemW + gap, centerY, itemW);
  }
  if (operator) {
    setBounds(operator, rect(pad + itemW + gap / 2 - 20, centerY - 20, 40, 40));
  }
}

function layoutItemGroup(item: SceneNode, x: number, centerY: number, w: number): void {
  const cx = x + w / 2;
  const circle = item.children.find(c => c.kind === 'fraction-circle');

  if (circle) {
    const boxH = 150;
    const y = centerY - boxH / 2;
    setBounds(item, rect(x, y, w, boxH));
    const d = Math.min(w * 0.45, 84);
    setBounds(circle, rect(cx - d / 2, y + 12, d, d));
    const label = item.children.find(c => c.role === 'label');
    if (label) {
      setBounds(label, rect(x, y + boxH - 44, w, 24));
    }
    const value = item.children.find(c => c.role === 'number');
    if (value) {
      setBounds(value, rect(x, y + boxH - 20, w, 16));
    }
    return;
  }

  const boxH = 110;
  const y = centerY - boxH / 2;
  setBounds(item, rect(x, y, w, boxH));
  const label = item.children.find(c => c.role === 'label');
  if (label) {
    setBounds(label, rect(x, y + 14, w, 24));
  }
  const value = item.children.find(c => c.role === 'number');
  if (value) {
    setBounds(value, rect(x, y + 44, w, 40));
  }
}

function layoutClock(node: SceneNode, ctx: LayoutContext): void {
  const face = node.children.find(c => c.role === 'visual' && c.kind === 'circle');
  const radius = Math.min(ctx.width, ctx.height) * 0.35;

  const cx = ctx.width / 2;
  const cy = Math.round(ctx.height / 2);

  if (face) {
    setBounds(face, rect(cx - radius, cy - radius, radius * 2, radius * 2));
  }

  const handRadius = radius * 0.88;
  for (const child of node.children) {
    const angle = child.geometry?.angle as number | undefined;
    if (child.kind === 'line' && typeof angle === 'number') {
      const end = polar(cx, cy, handRadius, angle);
      child.geometry = { ...child.geometry, points: [{ x: cx, y: cy }, end] };
      setBounds(child, rect(Math.min(cx, end.x), Math.min(cy, end.y), Math.abs(end.x - cx), Math.abs(end.y - cy)));
      continue;
    }
    if (child.kind === 'text' && typeof angle === 'number') {
      const p = polar(cx, cy, radius - 30, angle);
      setBounds(child, rect(p.x - 12, p.y - 10, 24, 20));
    }
  }
}

function layoutCoordinateGrid(node: SceneNode, ctx: LayoutContext): void {
  const pad = 48;
  const xAxis = node.children.find(c => c.id.includes('x-axis'));
  const yAxis = node.children.find(c => c.id.includes('y-axis'));

  const plotX = pad;
  const plotY = pad;
  const plotW = ctx.width - pad * 2;
  const plotH = ctx.height - pad * 2;
  const originX = plotX + plotW / 2;
  const originY = plotY + plotH / 2;

  if (xAxis) {
    xAxis.geometry = { points: [{ x: plotX, y: originY }, { x: plotX + plotW, y: originY }] };
    setBounds(xAxis, rect(plotX, originY - 2, plotW, 4));
  }
  if (yAxis) {
    yAxis.geometry = { points: [{ x: originX, y: plotY }, { x: originX, y: plotY + plotH }] };
    setBounds(yAxis, rect(originX - 2, plotY, 4, plotH));
  }

  // x/y ranges from the first gridlines' metadata is not present; infer from children geometry/values.
  // Determine scale extents from axis-less metadata on gridlines.
  const xVals: number[] = [];
  const yVals: number[] = [];
  for (const child of node.children) {
    if (child.id.includes('gridline-x') && typeof child.value === 'number') xVals.push(child.value);
    if (child.id.includes('gridline-y') && typeof child.value === 'number') yVals.push(child.value);
  }
  const xMin = xVals.length ? Math.min(...xVals) : -5;
  const xMax = xVals.length ? Math.max(...xVals) : 5;
  const yMin = yVals.length ? Math.min(...yVals) : -5;
  const yMax = yVals.length ? Math.max(...yVals) : 5;

  const toX = (v: number) => originX + ((v - (xMin + xMax) / 2) / ((xMax - xMin) || 1)) * (plotW / 2);
  const toY = (v: number) => originY - ((v - (yMin + yMax) / 2) / ((yMax - yMin) || 1)) * (plotH / 2);

  for (const child of node.children) {
    if (child.id.includes('gridline-x') && typeof child.value === 'number') {
      const x = toX(child.value);
      child.geometry = { points: [{ x, y: plotY }, { x, y: plotY + plotH }] };
      setBounds(child, rect(x - 1, plotY, 2, plotH));
    } else if (child.id.includes('gridline-y') && typeof child.value === 'number') {
      const y = toY(child.value);
      child.geometry = { points: [{ x: plotX, y }, { x: plotX + plotW, y }] };
      setBounds(child, rect(plotX, y - 1, plotW, 2));
    } else if (child.id.includes('point-') && child.kind === 'circle') {
      const g = child.geometry as { x?: number; y?: number } | undefined;
      if (g && typeof g.x === 'number' && typeof g.y === 'number') {
        const px = toX(g.x);
        const py = toY(g.y);
        setBounds(child, rect(px - 5, py - 5, 10, 10));
      }
    } else if (child.id.includes('line-') && child.kind === 'line') {
      const raw = child.geometry?.points as Array<{ x: number; y: number }> | undefined;
      if (Array.isArray(raw)) {
        const mapped = raw.map(p => ({ x: toX(p.x), y: toY(p.y) }));
        child.geometry = { points: mapped };
        const xs = mapped.map(p => p.x);
        const ys = mapped.map(p => p.y);
        setBounds(child, rect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
      }
    }
  }
}

function positionGeometryShape(shape: SceneNode, cx: number, cy: number, size: number): void {
  setBounds(shape, rect(cx - size / 2, cy - size / 2, size, size));

  const meta = shape.metadata as { sides?: number; shape?: string } | undefined;
  const sides = meta?.sides ?? 0;
  const r = size / 2;
  if (meta?.shape && meta.shape !== 'circle' && sides >= 3) {
    for (let i = 0; i < shape.children.length; i++) {
      const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      const v = shape.children[i]!;
      if (v.kind === 'circle') {
        setBounds(v, rect(px - 4, py - 4, 8, 8));
      }
    }
  }
}

function layoutGeometry(
  node: SceneNode,
  ctx: LayoutContext,
  slot?: { index: number; total: number },
): void {
  const shape = node.children.find(c => c.kind === 'shape');
  if (!shape) return;

  const defaultSize = Math.min(ctx.width, ctx.height) * 0.4;
  const cy = Math.round(ctx.height / 2);

  if (slot && slot.total > 1) {
    const pad = 40;
    const availW = ctx.width - pad * 2;
    const boxW = Math.min(availW / slot.total, 260);
    const gap = (availW - boxW * slot.total) / (slot.total - 1);
    const cx = pad + slot.index * (boxW + gap) + boxW / 2;
    const size = Math.min(boxW * 0.85, defaultSize);
    positionGeometryShape(shape, cx, cy, size);
    return;
  }

  const cx = ctx.width / 2;
  positionGeometryShape(shape, cx, cy, defaultSize);
}

function layoutIllustration(node: SceneNode, ctx: LayoutContext): void {
  const children = node.children;
  const count = children.length;
  if (count === 0) return;

  const pad = 40;
  const availW = ctx.width - pad * 2;
  const boxW = Math.min(availW / count, 220);
  const gap = (availW - boxW * count) / (count - 1 || 1);
  const boxH = 120;
  const y = Math.round(ctx.height / 2) - boxH / 2;

  for (let i = 0; i < count; i++) {
    const x = pad + i * (boxW + gap);
    setBounds(children[i]!, rect(x, y, boxW, boxH));
  }
}
