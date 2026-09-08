export type TimelineSemanticRole =
  | 'timeline' | 'axis' | 'gridline' | 'tick' | 'label'
  | 'period-band' | 'event-marker' | 'track-lane' | 'legend'
  | 'group' | 'selectable';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  role: TimelineSemanticRole;
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