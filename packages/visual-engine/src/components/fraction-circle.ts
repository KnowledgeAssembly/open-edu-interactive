import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface FractionComparisonProps {
  items: [ComparisonItem, ComparisonItem];
  comparison: ComparisonKind;
  interactive?: boolean;
}

export interface ComparisonItem {
  id: string;
  label: string;
  value: number;
}

export type ComparisonKind = 'greater-than' | 'less-than' | 'equal-to' | 'not-equal-to';

const OPERATOR_SYMBOLS: Record<ComparisonKind, string> = {
  'greater-than': '>',
  'less-than': '<',
  'equal-to': '=',
  'not-equal-to': '≠',
};

export function createFractionComparison(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const items = props.items as [ComparisonItem, ComparisonItem] | undefined;
  const comparison = props.comparison as ComparisonKind | undefined;
  const interactive = (props.interactive as boolean | undefined) ?? false;

  if (!items || items.length < 2) {
    throw new EngineError('INVALID_SPEC', 'fraction-comparison: items must have exactly 2 entries');
  }

  if (!comparison) {
    throw new EngineError('INVALID_SPEC', 'fraction-comparison: comparison kind is required');
  }

  if (!OPERATOR_SYMBOLS[comparison]) {
    throw new EngineError('INVALID_SPEC', `fraction-comparison: unknown comparison kind "${comparison}"`);
  }

  const nodes: SceneNode[] = [];

  for (let i = 0; i < 2; i++) {
    const item = items[i]!;
    const itemId = `${parentId}-item-${item.id}`;
    const itemChildren: SceneNode[] = [];

    itemChildren.push({
      id: `${parentId}-item-${item.id}-circle`,
      role: 'visual',
      kind: 'fraction-circle',
      value: item.value,
      children: [],
    });

    itemChildren.push({
      id: `${parentId}-item-${item.id}-label`,
      role: 'label',
      kind: 'text',
      label: item.label,
      children: [],
    });

    itemChildren.push({
      id: `${parentId}-item-${item.id}-value`,
      role: 'number',
      kind: 'text',
      value: item.value,
      label: String(item.value),
      children: [],
    });

    nodes.push({
      id: itemId,
      role: interactive ? 'selectable' : 'visual',
      kind: 'group',
      ...(interactive ? { interactive: true, acceptsActions: ['select', 'focus'] } : {}),
      children: itemChildren,
    });
  }

  nodes.push({
    id: `${parentId}-comparison-operator`,
    role: 'label',
    kind: 'text',
    label: OPERATOR_SYMBOLS[comparison],
    metadata: { comparison },
    children: [],
  });

  return nodes;
}

export const fractionComparisonComponent = {
  kind: 'fraction-comparison' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createFractionComparison(props, parentId);
  },
};