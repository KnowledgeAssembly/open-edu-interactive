import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import { CHART_KINDS } from '../schema.js';
import type { ChartSpec } from '../schema.js';

export function validateSemantic(spec: ChartSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const content = spec.content;

  if (!content) {
    return { valid: false, issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content is required' }] };
  }

  const kind = content.kind;
  if (!kind) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'content.kind is required' });
  } else if (!(CHART_KINDS as readonly string[]).includes(kind)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown content.kind "${kind}"` });
  }

  const dims = content.dimensions ?? [];
  const meas = content.measures ?? [];
  const data = content.data ?? [];

  const allIds = new Set<string>();
  for (const d of dims) {
    if (allIds.has(d.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate dimension id "${d.id}"` });
    }
    allIds.add(d.id);
  }
  for (const m of meas) {
    if (allIds.has(m.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate measure id "${m.id}"` });
    }
    allIds.add(m.id);
  }

  const dimIds = dims.map((d) => d.id);
  const measIds = meas.map((m) => m.id);
  const knownIds = new Set([...dimIds, ...measIds]);

  for (const [i, row] of data.entries()) {
    const rId = (row as Record<string, unknown>).id ?? `row-${i}`;

    for (const key of Object.keys(row as Record<string, unknown>)) {
      if (key === 'id' || key === 'links') continue;
      if (!knownIds.has(key)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": undeclared key "${key}"`,
        });
      }
    }

    for (const dimId of dimIds) {
      if (!((row as Record<string, unknown>)[dimId] !== undefined)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": missing dimension "${dimId}"`,
        });
      }
    }

    for (const measId of measIds) {
      if (!((row as Record<string, unknown>)[measId] !== undefined)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": missing measure "${measId}"`,
        });
      }
    }
  }

  if (kind === 'line' && data.length < 2) {
    issues.push({
      level: 'L2',
      code: 'INVALID_ENTITY',
      message: 'line chart requires at least 2 data points',
    });
  }

  const sources = (spec as unknown as { sources?: Array<{ type: string }> }).sources;
  if (!sources || sources.length === 0) {
    issues.push({
      level: 'L2',
      code: 'INVALID_SPEC',
      message: 'sources[] is required (provenance, DESIGN §9)',
    });
  }

  if (sources) {
    for (const src of sources) {
      if (!['authoritative', 'reference', 'illustrative', 'simulated', 'learner-generated', 'ai-generated'].includes(src.type)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_SPEC',
          message: `invalid source type "${src.type}"`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}