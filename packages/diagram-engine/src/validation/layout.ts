import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { Scene } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';

export function validateLayout(scene: Scene, ctx: LayoutContext): ValidationResult {
  const canvas = { x: 0, y: 0, width: ctx.width, height: ctx.height };
  const issues: ValidationResult['issues'] = [];

  function walk(node: Scene['nodes'][number]): void {
    if (node.bounds) {
      const b = node.bounds;
      if (b.x < canvas.x - 10 || b.y < canvas.y - 10 ||
          b.x + b.width > canvas.x + canvas.width + 10 ||
          b.y + b.height > canvas.y + canvas.height + 10) {
        issues.push({
          level: 'L3',
          code: 'INVALID_STATE',
          message: `node "${node.id}" bounds extend beyond canvas (${b.x},${b.y},${b.width},${b.height})`,
        });
      }
      if (node.interactive) {
        const reachable = b.width >= ctx.minTouchTarget || b.height >= ctx.minTouchTarget;
        if (!reachable) {
          issues.push({
            level: 'L3',
            code: 'ACCESSIBILITY_ERROR',
            message: `interactive node "${node.id}" smaller than minTouchTarget (${b.width}×${b.height} < ${ctx.minTouchTarget})`,
          });
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

  return { valid: issues.length === 0, issues };
}