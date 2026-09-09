import type { SceneNode, Scene } from './types.js';
import type { VisualContent } from '../schema.js';
import { ComponentRegistry } from '../components/registry.js';
import { numberLineComponent } from '../components/number-line.js';
import { countingSetComponent } from '../components/counting-set.js';
import { fractionBarComponent } from '../components/fraction-bar.js';
import { fractionComparisonComponent } from '../components/fraction-circle.js';
import { clockComponent } from '../components/clock.js';
import { coordinateGridComponent } from '../components/coordinate-grid.js';
import { geometryShapeComponent } from '../components/geometry-shape.js';
import { comparisonComponent } from '../components/comparison.js';

const registry = new ComponentRegistry();
registry.register(numberLineComponent);
registry.register(countingSetComponent);
registry.register(fractionBarComponent);
registry.register(fractionComparisonComponent);
registry.register(clockComponent);
registry.register(coordinateGridComponent);
registry.register(geometryShapeComponent);
registry.register(comparisonComponent);

export function buildScene(content: VisualContent): Scene {
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const seen = new Set<string>();

  function assertUnique(id: string): void {
    if (seen.has(id)) {
      throw new Error(`INVALID_ENTITY: duplicate id "${id}"`);
    }
    seen.add(id);
  }

  if (content.components) {
    for (const comp of content.components) {
      assertUnique(comp.id);
      const component = registry.get(comp.type);
      if (!component) {
        throw new Error(`INVALID_ENTITY: unknown component type "${comp.type}"`);
      }
      const childNodes = component.create((comp.props ?? {}) as Record<string, unknown>, comp.id);
      const group: SceneNode = {
        id: comp.id,
        role: 'group',
        kind: comp.type,
        children: childNodes,
      };
      nodes.push(group);
      semantics[comp.id] = group;
      for (const child of childNodes) {
        semantics[child.id] = child;
      }
    }
  }

  if (content.elements) {
    for (const elem of content.elements) {
      assertUnique(elem.id);
      const node: SceneNode = {
        id: elem.id,
        role: (elem.role ?? 'visual') as SceneNode['role'],
        kind: elem.type,
        value: elem.value,
        interactive: elem.interactive,
        acceptsActions: elem.acceptsActions,
        metadata: elem.style ? { style: elem.style } : undefined,
        children: [],
      };
      nodes.push(node);
      semantics[elem.id] = node;
    }
  }

  if (content.entities) {
    const groupId = `${content.entities[0]?.id ?? 'entities'}-illustration`;
    assertUnique(groupId);
    const children: SceneNode[] = [];
    for (const entity of content.entities) {
      assertUnique(entity.id);
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
    const group: SceneNode = {
      id: groupId,
      role: 'visual',
      kind: 'illustration',
      children,
    };
    nodes.push(group);
    semantics[groupId] = group;
    for (const child of children) {
      semantics[child.id] = child;
    }
  }

  if (content.relationships) {
    for (const rel of content.relationships) {
      if (!semantics[rel.source]) {
        throw new Error(`INVALID_REFERENCE: relationship source "${rel.source}" not found`);
      }
      if (!semantics[rel.target]) {
        throw new Error(`INVALID_REFERENCE: relationship target "${rel.target}" not found`);
      }
    }
  }

  return { nodes, semantics };
}
