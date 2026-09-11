import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { Scene, SceneNode, XY } from '../scene/types.js';
import { contained, regionsOverlap } from '../layout/geometry.js';
import type { LayoutContext } from '../layout/engine.js';

export function validateLayout(scene: Scene, ctx: LayoutContext): ValidationResult {
  const canvas = { x: 0, y: 0, width: ctx.width, height: ctx.height };
  const issues: ValidationResult['issues'] = [];

  const interactiveRegions: Array<{ id: string; bounds: NonNullable<SceneNode['bounds']>; rings: XY[][] }> = [];

  function walk(node: SceneNode): void {
    if (node.hidden) return;
    if (node.bounds) {
      if (!contained(node.bounds, canvas)) {
        issues.push({
          level: 'L3',
          code: 'INVALID_STATE',
          message: `node "${node.id}" bounds extend beyond the canvas (${node.bounds.x},${node.bounds.y},${node.bounds.width},${node.bounds.height})`,
        });
      }
    }
    if (node.interactive) {
      const b = node.bounds;
      if (b) {
        const reachable = b.width >= ctx.minTouchTarget || b.height >= ctx.minTouchTarget;
        if (!reachable) {
          issues.push({
            level: 'L3',
            code: 'ACCESSIBILITY_ERROR',
            message: `interactive node "${node.id}" is smaller than minTouchTarget in both dimensions (${b.width}×${b.height} < ${ctx.minTouchTarget})`,
          });
        }
        if (node.role === 'region') {
          const rings = node.rings && node.rings.length > 0 ? node.rings : node.path ? [node.path] : [];
          interactiveRegions.push({ id: node.id, bounds: b, rings });
        }
      }
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of scene.nodes) {
    walk(node);
  }

  for (let i = 0; i < interactiveRegions.length; i++) {
    for (let j = i + 1; j < interactiveRegions.length; j++) {
      const a = interactiveRegions[i]!;
      const b = interactiveRegions[j]!;
      if (a.rings.length === 0 || b.rings.length === 0) continue;
      if (regionsOverlap(a.rings, b.rings)) {
        issues.push({
          level: 'L3',
          code: 'INVALID_STATE',
          message: `required interactive region "${a.id}" overlaps region "${b.id}"`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}