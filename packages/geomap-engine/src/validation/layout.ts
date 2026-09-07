import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { Scene } from '../scene/types.js';
import { contained } from '../layout/geometry.js';
import type { LayoutContext } from '../layout/engine.js';

export function validateLayout(scene: Scene, ctx: LayoutContext): ValidationResult {
  const canvas = { x: 0, y: 0, width: ctx.width, height: ctx.height };
  const issues: ValidationResult['issues'] = [];

  for (const node of scene.nodes) {
    if (!node.bounds) continue;
    if (!contained(node.bounds, canvas)) {
      issues.push({
        level: 'L3',
        code: 'INVALID_STATE',
        message: `node "${node.id}" bounds extend beyond the canvas (${node.bounds.x},${node.bounds.y},${node.bounds.width},${node.bounds.height})`,
      });
    }
    if (node.interactive) {
      const reachable =
        node.bounds.width >= ctx.minTouchTarget || node.bounds.height >= ctx.minTouchTarget;
      if (!reachable) {
        issues.push({
          level: 'L3',
          code: 'ACCESSIBILITY_ERROR',
          message: `interactive node "${node.id}" is smaller than minTouchTarget in both dimensions (${node.bounds.width}×${node.bounds.height} < ${ctx.minTouchTarget})`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}