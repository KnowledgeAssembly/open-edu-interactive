export type SemanticRole =
  | 'visual' | 'group' | 'label' | 'diagram' | 'diagram-part'
  | 'number' | 'number-line' | 'tick' | 'axis' | 'marker'
  | 'counting-object' | 'fraction' | 'fraction-part'
  | 'shape' | 'option' | 'answer' | 'drop-target'
  | 'selectable' | 'draggable' | 'hotspot';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  role: SemanticRole;
  kind: string;
  value?: number;
  label?: string;
  bounds?: Bounds;
  geometry?: Record<string, unknown>;
  acceptsActions?: string[];
  interactive?: boolean;
  annotationId?: string;
  metadata?: Record<string, unknown>;
  children: SceneNode[];
}

export interface Scene {
  nodes: SceneNode[];
  semantics: Record<string, SceneNode>;
}