import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { VisualSpec } from '../schema.js';
import { buildScene } from '../scene/build.js';
import { layout } from '../layout/engine.js';
import { contained, rect } from '../layout/geometry.js';

export function validateLayout(spec: VisualSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  try {
    if (!spec.content) {
      return { valid: true, issues: [] };
    }
    const scene = buildScene(spec.content);
    const canvasWidth = 800;
    const canvasHeight = 600;

    const laid = layout(scene, {
      width: canvasWidth, height: canvasHeight, minTouchTarget: 44, textStyle: 'normal',
    });

    for (const node of laid.nodes) {
      if (node.bounds) {
        if (!contained(node.bounds, rect(0, 0, canvasWidth, canvasHeight))) {
          issues.push({ level: 'L3', code: 'INVALID_STATE', message: `element "${node.id}" extends beyond canvas bounds` });
        }
        if (node.bounds.width < 1 || node.bounds.height < 1) {
          issues.push({ level: 'L3', code: 'INVALID_STATE', message: `element "${node.id}" has degenerate bounds` });
        }
      }
    }
  } catch (err) {
    issues.push({ level: 'L3', code: 'INVALID_STATE', message: `layout failed: ${(err as Error).message}` });
  }

  return { valid: issues.length === 0, issues };
}