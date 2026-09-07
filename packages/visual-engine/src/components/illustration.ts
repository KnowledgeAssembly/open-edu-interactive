import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface EntitySpec {
  id: string;
  label: string;
}

export interface IllustrationProps {
  entities: EntitySpec[];
}

export function createIllustration(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const entities = props.entities;
  if (!Array.isArray(entities)) {
    throw new EngineError('INVALID_ENTITY', `illustration "${parentId}": entities array is required`);
  }

  const seen = new Set<string>();
  const children: SceneNode[] = [];
  for (const entry of entities as unknown[]) {
    const entity = entry as Partial<EntitySpec>;
    if (typeof entity?.id !== 'string' || !entity.id) {
      throw new EngineError('INVALID_ENTITY', `illustration "${parentId}": entity missing id`);
    }
    if (seen.has(entity.id)) {
      throw new EngineError('INVALID_ENTITY', `illustration "${parentId}": duplicate entity id "${entity.id}"`);
    }
    seen.add(entity.id);
    children.push({
      id: entity.id,
      role: 'selectable',
      kind: 'entity',
      label: entity.label,
      interactive: true,
      acceptsActions: ['select', 'focus'],
      children: [],
    });
  }

  return [
    {
      id: parentId,
      role: 'visual',
      kind: 'illustration',
      children,
    },
  ];
}

export const illustrationComponent = {
  kind: 'illustration' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createIllustration(props, parentId);
  },
};