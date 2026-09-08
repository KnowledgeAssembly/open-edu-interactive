import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { GeoMapSpec } from '../schema.js';
import type { SvgResult } from '../render/types.js';

function hasColorLiterals(svg: string): boolean {
  return /#[0-9a-fA-F]{3,8}\b/.test(svg) || /(rgb|hsl)\(/.test(svg);
}

export function validateAccessibility(spec: GeoMapSpec, rendered: SvgResult): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!spec.accessibility?.label) {
    issues.push({
      level: 'L4',
      code: 'ACCESSIBILITY_ERROR',
      message: 'accessibility.label is required',
    });
  }

  for (const node of rendered.a11y) {
    if (!node.label || node.label.trim().length === 0) {
      issues.push({
        level: 'L4',
        code: 'ACCESSIBILITY_ERROR',
        message: `interactive node "${node.id}" has an empty label`,
      });
    }
  }

  if (rendered.alternative.length === 0) {
    issues.push({
      level: 'L4',
      code: 'ACCESSIBILITY_ERROR',
      message: 'alternative list is empty; it must cover every entity',
    });
  }

  if (hasColorLiterals(rendered.svg)) {
    issues.push({
      level: 'L4',
      code: 'ACCESSIBILITY_ERROR',
      message: 'rendered SVG contains literal colors; no meaning may be conveyed by color alone',
    });
  }

  return { valid: issues.length === 0, issues };
}