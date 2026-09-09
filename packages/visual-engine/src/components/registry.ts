import type { VisualComponent } from './types.js';

export class ComponentRegistry {
  private components = new Map<string, VisualComponent>();

  register(component: VisualComponent): void {
    this.components.set(component.kind, component);
  }

  get(kind: string): VisualComponent | undefined {
    return this.components.get(kind);
  }

  list(): string[] {
    return [...this.components.keys()];
  }
}
