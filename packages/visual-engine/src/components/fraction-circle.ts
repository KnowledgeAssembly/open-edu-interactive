import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface FractionCircleProps {
  numerator: number;
  denominator: number;
  showFraction?: boolean;
  highlightedParts?: number[];
  allowImproper?: boolean;
}

export function createFractionCircle(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const numerator = props.numerator as number;
  const denominator = props.denominator as number;
  const showFraction = props.showFraction !== false;
  const highlightedParts = props.highlightedParts as number[] | undefined;
  const allowImproper = props.allowImproper as boolean | undefined;

  if (typeof numerator !== 'number' || !Number.isFinite(numerator) || numerator < 0) {
    throw new EngineError('INVALID_ENTITY', 'fraction-circle: numerator must be a non-negative finite number');
  }
  if (typeof denominator !== 'number' || !Number.isFinite(denominator) || denominator <= 0) {
    throw new EngineError('INVALID_ENTITY', 'fraction-circle: denominator must be a positive finite number');
  }
  if (!allowImproper && numerator > denominator) {
    throw new EngineError('INVALID_ENTITY', 'fraction-circle: numerator must not exceed denominator when allowImproper is false');
  }

  const nodes: SceneNode[] = [];

  // Root fraction-circle group
  const circleId = `${parentId}-circle`;
  nodes.push({
    id: circleId,
    role: 'fraction',
    kind: 'fraction-circle',
    children: [],
  });

  // Fraction parts
  for (let i = 0; i < denominator; i++) {
    const partId = `${parentId}-part-${i}`;
    const isHighlighted = highlightedParts?.includes(i) ?? false;
    nodes.push({
      id: partId,
      role: 'fraction-part',
      kind: 'circle',
      value: i,
      ...(isHighlighted ? {
        interactive: true,
        acceptsActions: ['select', 'focus'],
      } : {}),
      children: [],
    });
  }

  // Label
  if (showFraction) {
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

export const fractionCircleComponent = {
  kind: 'fraction-comparison' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createFractionCircle(props, parentId);
  },
};