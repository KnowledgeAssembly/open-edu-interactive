import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface NumberLineProps {
  min: number;
  max: number;
  step: number;
  majorStep?: number;
  showLabels?: boolean;
  direction?: 'horizontal' | 'vertical';
  points?: number[];
  highlight?: number[];
  rangeHighlight?: [number, number][];
}

export function createNumberLine(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const min = props.min as number;
  const max = props.max as number;
  const step = props.step as number;

  if (max <= min) {
    throw new EngineError('INVALID_ENTITY', 'number-line: max must be greater than min');
  }
  if (step <= 0) {
    throw new EngineError('INVALID_ENTITY', 'number-line: step must be positive');
  }

  const nodes: SceneNode[] = [];

  // Axis carries the semantic scale so layout can map values to positions
  const axisId = `${parentId}-axis`;
  nodes.push({
    id: axisId,
    role: 'axis',
    kind: 'line',
    children: [],
    metadata: {
      scale: { min, max, step, direction: props.direction === 'vertical' ? 'vertical' : 'horizontal' },
    },
  });

  // Ticks + labels
  const showLabels = props.showLabels !== false;
  for (let v = min; v <= max; v += step) {
    const tickId = `${parentId}-tick-${v}`;
    nodes.push({
      id: tickId,
      role: 'tick',
      kind: 'tick',
      value: v,
      children: [],
    });

    if (showLabels) {
      nodes.push({
        id: `${parentId}-label-${v}`,
        role: 'number',
        kind: 'text',
        value: v,
        label: String(v),
        children: [],
      });
    }
  }

  // Highlight markers
  const highlight = props.highlight as number[] | undefined;
  if (highlight) {
    for (const v of highlight) {
      if (v < min || v > max) continue;
      nodes.push({
        id: `${parentId}-marker-${v}`,
        role: 'marker',
        kind: 'circle',
        value: v,
        interactive: true,
        acceptsActions: ['select', 'focus'],
        children: [],
      });
    }
  }

  // Point markers
  const points = props.points as number[] | undefined;
  if (points) {
    for (const v of points) {
      if (v < min || v > max) continue;
      nodes.push({
        id: `${parentId}-point-${v}`,
        role: 'marker',
        kind: 'circle',
        value: v,
        children: [],
      });
    }
  }

  return nodes;
}

export const numberLineComponent = {
  kind: 'number-line' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createNumberLine(props, parentId);
  },
};