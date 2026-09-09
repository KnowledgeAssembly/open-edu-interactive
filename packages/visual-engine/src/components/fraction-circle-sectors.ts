import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface FractionCircleSectorsProps {
  numerator: number;
  denominator: number;
  highlightedParts?: number[];
  showFraction?: boolean;
  allowImproper?: boolean;
  interactive?: boolean;
}

export function createFractionCircleSectors(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const numerator = props.numerator as number;
  const denominator = props.denominator as number;
  const showFraction = props.showFraction as boolean | undefined;
  const highlightedParts = props.highlightedParts as number[] | undefined;
  const allowImproper = props.allowImproper as boolean | undefined;
  const discovery = (props.interactive as boolean | undefined) ?? false;

  if (denominator < 2) {
    throw new EngineError('INVALID_ENTITY', 'fraction-circle: denominator must be at least 2');
  }
  if (numerator < 0) {
    throw new EngineError('INVALID_ENTITY', 'fraction-circle: numerator must not be negative');
  }
  if (!allowImproper && numerator > denominator) {
    throw new EngineError('INVALID_ENTITY', 'fraction-circle: numerator must not exceed denominator (allow improper fractions)');
  }

  const nodes: SceneNode[] = [];

  const rootGroup: SceneNode = {
    id: parentId,
    role: 'group',
    kind: 'fraction-circle',
    children: [],
  };

  for (let i = 0; i < denominator; i++) {
    const sectorId = `${parentId}-sector-${i}`;
    const isHighlighted = highlightedParts?.includes(i) ?? false;
    const isSelectable = discovery || isHighlighted;

    rootGroup.children.push({
      id: sectorId,
      role: 'fraction-part',
      kind: 'wedge',
      value: i,
      ...(isSelectable
        ? { interactive: true, acceptsActions: ['select', 'focus'] }
        : {}),
      children: [],
    });
  }

  nodes.push(rootGroup);

  if (showFraction !== false) {
    nodes.push({
      id: `${parentId}-label`,
      role: 'label',
      kind: 'text',
      label: `${numerator}/${denominator}`,
      children: [],
    });
  }

  return nodes;
}

export const fractionCircleSectorsComponent = {
  kind: 'fraction-circle' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createFractionCircleSectors(props, parentId);
  },
};