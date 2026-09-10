import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface FractionBarProps {
  numerator: number;
  denominator: number;
  showFraction?: boolean;
  highlightedParts?: number[];
  allowImproper?: boolean;
}

export function createFractionBar(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const numerator = props.numerator as number;
  const denominator = props.denominator as number;
  const showFraction = props.showFraction as boolean | undefined;
  const highlightedParts = props.highlightedParts as number[] | undefined;
  const allowImproper = props.allowImproper as boolean | undefined;
  const discovery = (props.interactive as boolean | undefined) ?? false;

  if (denominator <= 0) {
    throw new EngineError('INVALID_ENTITY', 'fraction-bar: denominator must be greater than 0');
  }
  if (numerator < 0) {
    throw new EngineError('INVALID_ENTITY', 'fraction-bar: numerator must not be negative');
  }
  if (!allowImproper && numerator > denominator) {
    throw new EngineError('INVALID_ENTITY', 'fraction-bar: numerator must not exceed denominator (allow improper fractions)');
  }

  const nodes: SceneNode[] = [];

  const barId = `${parentId}-bar`;
  const barChildren: SceneNode[] = [];

  for (let i = 0; i < denominator; i++) {
    const partId = `${parentId}-part-${i}`;
    const isHighlighted = highlightedParts?.includes(i) ?? false;
    const isSelectable = discovery || isHighlighted;

    barChildren.push({
      id: partId,
      role: 'fraction-part',
      kind: 'rect',
      value: i,
      ...(isSelectable
        ? { interactive: true, acceptsActions: ['select', 'focus'] }
        : {}),
      children: [],
    });
  }

  nodes.push({
    id: barId,
    role: 'group',
    kind: 'fraction-bar',
    children: barChildren,
  });

  if (showFraction !== false) {
    nodes.push({
      id: `${parentId}-fraction-label`,
      role: 'label',
      kind: 'text',
      label: `${numerator}/${denominator}`,
      children: [],
    });
  }

  return nodes;
}

export const fractionBarComponent = {
  kind: 'fraction' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createFractionBar(props, parentId);
  },
};