export interface VisualComponent {
  kind: string;
  create(props: Record<string, unknown>, parentId: string): import('../scene/types.js').SceneNode[];
}