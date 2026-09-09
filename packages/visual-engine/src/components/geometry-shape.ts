import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface GeometryShapeProps {
  shape: 'triangle' | 'square' | 'rectangle' | 'circle' | 'pentagon' | 'hexagon';
  label?: string;
  showVertices?: boolean;
  highlight?: boolean;
  highlightVertices?: boolean;
  highlightSides?: boolean;
  interactive?: boolean;
}

const SIDE_COUNTS: Record<string, number> = {
  triangle: 3,
  square: 4,
  rectangle: 4,
  pentagon: 5,
  hexagon: 6,
};

function createPolygonSides(
  shape: string,
  parentId: string,
  isSelectable: boolean,
): SceneNode[] {
  const count = SIDE_COUNTS[shape];
  if (!count) return [];

  const nodes: SceneNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `${parentId}-side-${i}`,
      role: 'diagram-part',
      kind: 'line',
      ...(isSelectable ? { interactive: true, acceptsActions: ['select', 'focus'] } : {}),
      children: [],
    });
  }
  return nodes;
}

function createCircleNode(parentId: string): SceneNode[] {
  return [
    {
      id: `${parentId}-circle`,
      role: 'diagram-part',
      kind: 'circle',
      children: [],
    },
  ];
}

function createVertices(shape: string, parentId: string, isSelectable: boolean): SceneNode[] {
  const count = shape === 'circle' ? 0 : (SIDE_COUNTS[shape] ?? 0);
  const nodes: SceneNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `${parentId}-vertex-${i}`,
      role: 'marker',
      kind: 'circle',
      ...(isSelectable ? { interactive: true, acceptsActions: ['select', 'focus'] } : {}),
      children: [],
    });
  }
  return nodes;
}

export const geometryShapeComponent = {
  kind: 'geometry' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    const shape = props.shape as string;
    const label = props.label as string | undefined;
    const showVertices = props.showVertices as boolean | undefined;
    const highlight = props.highlight as boolean | undefined;
    const highlightVertices = props.highlightVertices as boolean | undefined;
    const highlightSides = props.highlightSides as boolean | undefined;

    const flagCount = [highlight, highlightVertices, highlightSides].filter(Boolean).length;
    if (flagCount > 1) {
      throw new EngineError('INVALID_SPEC', 'geometry: at most one of highlight, highlightVertices, highlightSides may be true');
    }
    if (highlightVertices && !showVertices) {
      throw new EngineError('INVALID_SPEC', 'geometry: highlightVertices requires showVertices: true');
    }

    if (!shape || (!SIDE_COUNTS[shape] && shape !== 'circle')) {
      throw new EngineError('INVALID_SPEC', `geometry: unknown shape "${shape}"`);
    }

    const shapeGroupId = `${parentId}-shape`;

    const isShapeSelectable = highlight === true;
    const areSidesSelectable = highlightSides === true;
    const areVerticesSelectable = highlightVertices === true;

    const shapeNode: SceneNode = {
      id: shapeGroupId,
      role: 'shape',
      kind: 'shape',
      ...(isShapeSelectable ? { interactive: true, acceptsActions: ['select', 'focus'] } : {}),
      metadata: { shape, sides: SIDE_COUNTS[shape] ?? 0 },
      children: [],
    };

    if (label) {
      shapeNode.label = label;
    }

    if (shape === 'circle') {
      shapeNode.children.push(...createCircleNode(shapeGroupId));
    } else {
      shapeNode.children.push(...createPolygonSides(shape, shapeGroupId, areSidesSelectable));
    }

    if (showVertices) {
      shapeNode.children.push(...createVertices(shape, shapeGroupId, areVerticesSelectable));
    }

    return [shapeNode];
  },
};