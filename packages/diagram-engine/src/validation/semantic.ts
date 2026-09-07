import { ACTION_TYPES, type ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { DiagramSpec } from '../schema.js';
import { DIAGRAM_KINDS, PROFILES, RELATIONSHIPS, SOURCE_CLASSES } from '../schema.js';
import { adjacency, detectCycles } from '../layout/graph.js';

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

export function validateSemantic(spec: DiagramSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const content = spec.content;

  if (!content) {
    return { valid: false, issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content is required' }] };
  }

  // Check kind
  if (!(DIAGRAM_KINDS as readonly string[]).includes(content.kind)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown kind "${content.kind}"` });
  }

  // Check profile if present
  if (content.profile && !(PROFILES as readonly string[]).includes(content.profile)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown profile "${content.profile}"` });
  }

  // Check nodes
  const nodeIds = new Set<string>();
  const nodes = content.nodes;
  if (!nodes || !Array.isArray(nodes)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'content.nodes must be a non-empty array' });
    return { valid: false, issues };
  }
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate node id "${node.id}"` });
    }
    nodeIds.add(node.id);
    if (!isNonEmptyString(node.label)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `node "${node.id}" label must be non-empty` });
    }
  }

  // Check edges
  const edges = content.edges ?? [];
  const edgeIds = new Set<string>();
  const tripleSet = new Set<string>();
  for (const edge of edges) {
    const edgeId = edge.id ?? `edge-${edge.from}-${edge.to}`;
    if (edgeIds.has(edgeId)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate edge id "${edgeId}"` });
    }
    edgeIds.add(edgeId);

    // Check relationship is valid
    if (!(RELATIONSHIPS as readonly string[]).includes(edge.relationship)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown relationship "${edge.relationship}" on edge "${edgeId}"` });
    }

    // Check from/to refs
    if (!nodeIds.has(edge.from)) {
      issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `edge "${edgeId}" references unknown node "${edge.from}"` });
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `edge "${edgeId}" references unknown node "${edge.to}"` });
    }

    // Self-loop
    if (edge.from === edge.to) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `self-loop edge "${edgeId}" from "${edge.from}" to itself` });
    }

    // Duplicate triple
    const tripleKey = `${edge.from}|${edge.to}|${edge.relationship}`;
    if (tripleSet.has(tripleKey)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate edge triple (${edge.from}, ${edge.to}, ${edge.relationship})` });
    }
    tripleSet.add(tripleKey);
  }

  // Graph-level cycle checks
  if (issues.length === 0 && (content.kind === 'flow' || content.kind === 'hierarchy')) {
    const nodeIdsList = Array.from(nodeIds);
    const edgePairs = edges.map((e) => ({ from: e.from, to: e.to }));
    const g = adjacency(nodeIdsList, edgePairs);
    const { hasCycle, cycles } = detectCycles(g);
    if (hasCycle && content.kind === 'flow') {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: `flow kind must be acyclic, found ${cycles.length} cycle(s): ${cycles.map((c) => `[${c.join(', ')}]`).join('; ')}`,
      });
    }
    if (hasCycle && content.kind === 'hierarchy') {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: `hierarchy kind must be acyclic, found ${cycles.length} cycle(s): ${cycles.map((c) => `[${c.join(', ')}]`).join('; ')}`,
      });
    }
  }

  if (content.kind === 'cycle') {
    // Cycle kind must have at least one cycle
    const nodeIdsList = Array.from(nodeIds);
    const edgePairs = edges.map((e) => ({ from: e.from, to: e.to }));
    const g = adjacency(nodeIdsList, edgePairs);
    const { hasCycle } = detectCycles(g);
    if (!hasCycle) {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: 'cycle kind must contain at least one directed cycle',
      });
    }
  }

  // Check actions
  const actions = spec.interaction?.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!(ACTION_TYPES as readonly string[]).includes(action)) {
        issues.push({ level: 'L2', code: 'INVALID_ACTION', message: `interaction.actions contains non-D5 action "${action}"` });
      }
    }
  }

  // Check sources
  const sources = spec.sources;
  if (sources) {
    for (const src of sources) {
      if (!(SOURCE_CLASSES as readonly string[]).includes(src.class)) {
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: `invalid source class "${src.class}"` });
      }
    }
  }

  // Check layout type if present
  if (spec.layout?.type) {
    const layoutTypes = ['grid', 'hierarchical', 'radial'];
    if (!layoutTypes.includes(spec.layout.type)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown layout type "${spec.layout.type}"` });
    }
  }

  return { valid: issues.length === 0, issues };
}