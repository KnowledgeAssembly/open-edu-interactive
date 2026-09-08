export type GeoMapSemanticRole =
  | 'map' | 'layer' | 'region' | 'marker' | 'route' | 'route-segment'
  | 'label' | 'legend' | 'legend-item' | 'selectable' | 'group';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface XY {
  x: number;
  y: number;
}

export interface SceneNode {
  id: string;
  role: GeoMapSemanticRole;
  kind: string;
  geometry?: { type: string; coordinates: unknown };
  bounds?: Bounds;
  path?: XY[];
  points?: XY[];
  hidden?: boolean;
  label?: string;
  description?: string;
  interactive?: boolean;
  acceptsActions?: string[];
  metadata?: Record<string, unknown>;
  children: SceneNode[];
}

export interface Scene {
  nodes: SceneNode[];
  semantics: Record<string, SceneNode>;
}