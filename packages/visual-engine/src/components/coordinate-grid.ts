import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface CoordinateGridProps {
  x: { min: number; max: number; step: number };
  y: { min: number; max: number; step: number };
  points?: { x: number; y: number; id?: string }[];
  lines?: { points: { x: number; y: number }[]; id?: string }[];
  highlightPoints?: string[];
  interactive?: boolean;
}

export function createCoordinateGrid(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const x = props.x as { min: number; max: number; step: number };
  const y = props.y as { min: number; max: number; step: number };
  const highlightPoints = props.highlightPoints as string[] | undefined;
  const discovery = (props.interactive as boolean | undefined) ?? false;

  if (x.max <= x.min) {
    throw new EngineError('INVALID_ENTITY', 'coordinate-grid: x.max must be greater than x.min');
  }
  if (y.max <= y.min) {
    throw new EngineError('INVALID_ENTITY', 'coordinate-grid: y.max must be greater than y.min');
  }
  if (x.step <= 0) {
    throw new EngineError('INVALID_ENTITY', 'coordinate-grid: x.step must be positive');
  }
  if (y.step <= 0) {
    throw new EngineError('INVALID_ENTITY', 'coordinate-grid: y.step must be positive');
  }

  const nodes: SceneNode[] = [];

  // X-axis
  nodes.push({
    id: `${parentId}-x-axis`,
    role: 'axis',
    kind: 'line',
    children: [],
  });

  // Y-axis
  nodes.push({
    id: `${parentId}-y-axis`,
    role: 'axis',
    kind: 'line',
    children: [],
  });

  // Gridlines — x steps (vertical lines)
  let gridIdx = 0;
  for (let v = x.min; v <= x.max + x.step / 2; v += x.step) {
    nodes.push({
      id: `${parentId}-gridline-x-${gridIdx}`,
      role: 'marker',
      kind: 'line',
      value: v,
      children: [],
    });
    gridIdx++;
  }

  // Gridlines — y steps (horizontal lines)
  gridIdx = 0;
  for (let v = y.min; v <= y.max + y.step / 2; v += y.step) {
    nodes.push({
      id: `${parentId}-gridline-y-${gridIdx}`,
      role: 'marker',
      kind: 'line',
      value: v,
      children: [],
    });
    gridIdx++;
  }

  // Points
  const points = props.points as { x: number; y: number; id?: string }[] | undefined;
  if (points) {
    const highlightSet = highlightPoints ? new Set(highlightPoints) : null;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i]!;
      if (!pt.id && (discovery || (highlightPoints != null && highlightPoints.length > 0))) {
        throw new EngineError('INVALID_SPEC', 'coordinate-grid: points must have id when interactive or highlightPoints is set');
      }
      const suffix = pt.id ?? String(i);
      const isHighlighted = highlightSet?.has(pt.id ?? '') ?? false;
      const isSelectable = discovery || isHighlighted;
      nodes.push({
        id: `${parentId}-point-${suffix}`,
        role: 'marker',
        kind: 'circle',
        value: pt.x,
        geometry: { x: pt.x, y: pt.y },
        ...(isSelectable ? { interactive: true, acceptsActions: ['select', 'focus'] } : {}),
        children: [],
      });
    }
  }

  // Lines
  const lines = props.lines as { points: { x: number; y: number }[]; id?: string }[] | undefined;
  if (lines) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const suffix = line.id ?? String(i);
      nodes.push({
        id: `${parentId}-line-${suffix}`,
        role: 'marker',
        kind: 'line',
        geometry: { points: line.points },
        children: [],
      });
    }
  }

  return nodes;
}

export const coordinateGridComponent = {
  kind: 'coordinate-grid' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createCoordinateGrid(props, parentId);
  },
};