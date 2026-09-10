import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface NumberLineProps {
  min: number;
  max: number;
  step: number;
  showLabels?: boolean;
  direction?: 'horizontal' | 'vertical';
  points?: number[];
  highlight?: number[];
  interactive?: boolean;
}

export function createNumberLine(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const min = props.min as number;
  const max = props.max as number;
  const step = props.step as number;
  const discovery = (props.interactive as boolean | undefined) ?? false;

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
  const highlight = props.highlight as number[] | undefined;
  const highlightSet = highlight ? new Set(highlight) : null;

  const markers: SceneNode[] = [];

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

    // Marker/Interactive logic
    const isHighlighted = highlightSet?.has(v) ?? false;

    if (discovery) {
      // Discovery: no marker circles. Labels (or ticks) are interactive targets.
      if (showLabels) {
        const labelNode = nodes.find((n) => n.id === `${parentId}-label-${v}`);
        if (labelNode) {
          labelNode.interactive = true;
          labelNode.acceptsActions = ['select', 'focus'];
          if (isHighlighted) {
            labelNode.metadata = { ...labelNode.metadata, emphasized: true };
          }
        }
      } else {
        const tickNode = nodes.find((n) => n.id === `${parentId}-tick-${v}`);
        if (tickNode) {
          tickNode.interactive = true;
          tickNode.acceptsActions = ['select', 'focus'];
          if (isHighlighted) {
            tickNode.metadata = { ...tickNode.metadata, emphasized: true };
          }
        }
      }
    } else if (isHighlighted) {
      markers.push({
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

  nodes.push(...markers);

  // Point markers (legacy/points prop)
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