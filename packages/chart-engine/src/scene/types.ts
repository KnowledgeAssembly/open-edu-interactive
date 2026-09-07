export type ChartSemanticRole =
  | 'chart' | 'axis' | 'gridline' | 'tick' | 'label' | 'value-label'
  | 'bar' | 'line-segment' | 'point' | 'marker' | 'legend'
  | 'selectable' | 'group' | 'visual';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  role: ChartSemanticRole;
  kind: string;
  value?: number;
  label?: string;
  bounds?: Bounds;
  interactive?: boolean;
  acceptsActions?: string[];
  metadata?: Record<string, unknown>;
  children: SceneNode[];
}

export interface Scene {
  nodes: SceneNode[];
  semantics: Record<string, SceneNode>;
}