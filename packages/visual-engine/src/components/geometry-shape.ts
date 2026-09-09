import type { SceneNode } from '../scene/types.js';

export interface GeometryShapeProps {
  shape: 'triangle' | 'square' | 'rectangle' | 'circle' | 'pentagon' | 'hexagon';
  size?: number;
  label?: string;
  showVertices?: boolean;
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
): SceneNode[] {
  const count = SIDE_COUNTS[shape];
  if (!count) return [];

  const nodes: SceneNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `${parentId}-side-${i}`,
      role: 'diagram-part',
      kind: 'line',
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

function createVertices(shape: string, parentId: string): SceneNode[] {
  const count = shape === 'circle' ? 0 : (SIDE_COUNTS[shape] ?? 0);
  const nodes: SceneNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `${parentId}-vertex-${i}`,
      role: 'marker',
      kind: 'circle',
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

    if (!shape || !SIDE_COUNTS[shape] && shape !== 'circle') {
      return [];
    }

    const shapeGroupId = `${parentId}-shape`;

    const shapeNode: SceneNode = {
      id: shapeGroupId,
      role: 'shape',
      kind: 'shape',
      metadata: { shape, sides: SIDE_COUNTS[shape] ?? 0 },
      children: [],
    };

    if (label) {
      shapeNode.label = label;
    }

    if (shape === 'circle') {
      shapeNode.children.push(...createCircleNode(shapeGroupId));
    } else {
      shapeNode.children.push(...createPolygonSides(shape, shapeGroupId));
    }

    if (showVertices) {
      shapeNode.children.push(...createVertices(shape, shapeGroupId));
    }

    return [shapeNode];
  },
};