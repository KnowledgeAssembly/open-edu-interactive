import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface ClockProps {
  hour: number;
  minute: number;
  showNumbers?: boolean;
  showHands?: boolean;
}

export function createClock(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const hour = props.hour as number;
  const minute = props.minute as number;
  const showNumbers = props.showNumbers !== false;
  const showHands = props.showHands !== false;

  if (hour < 0 || hour > 12 || !Number.isInteger(hour)) {
    throw new EngineError('INVALID_ENTITY', 'clock: hour must be an integer between 0 and 12');
  }
  if (minute < 0 || minute > 59 || !Number.isInteger(minute)) {
    throw new EngineError('INVALID_ENTITY', 'clock: minute must be an integer between 0 and 59');
  }

  const nodes: SceneNode[] = [];

  nodes.push({
    id: `${parentId}-face`,
    role: 'visual',
    kind: 'circle',
    children: [],
  });

  if (showHands) {
    const hourAngle = (hour % 12) * 30 + minute * 0.5;
    nodes.push({
      id: `${parentId}-hour-hand`,
      role: 'marker',
      kind: 'line',
      value: hour,
      geometry: { angle: hourAngle },
      children: [],
    });

    const minuteAngle = minute * 6;
    nodes.push({
      id: `${parentId}-minute-hand`,
      role: 'marker',
      kind: 'line',
      value: minute,
      geometry: { angle: minuteAngle },
      children: [],
    });
  }

  if (showNumbers) {
    for (let n = 1; n <= 12; n++) {
      const labelAngle = n * 30;
      nodes.push({
        id: `${parentId}-number-${n}`,
        role: 'number',
        kind: 'text',
        value: n,
        label: String(n),
        geometry: { angle: labelAngle },
        children: [],
      });
    }
  }

  return nodes;
}

export const clockComponent = {
  kind: 'clock' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createClock(props, parentId);
  },
};