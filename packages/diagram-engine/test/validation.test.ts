import { describe, it, expect } from 'vitest';
import { DiagramEngine } from '../src/engine.js';
import type { DiagramSpec } from '../src/schema.js';

const engine = new DiagramEngine();

const VALID_CYCLE: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'water-cycle',
  content: {
    kind: 'cycle',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [
      { from: 'a', to: 'b', relationship: 'leads-to' },
      { from: 'b', to: 'a', relationship: 'leads-to' },
    ],
  },
  accessibility: { label: 'Test cycle' },
};

const VALID_FLOW: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'test-flow',
  content: {
    kind: 'flow',
    nodes: [
      { id: 'start', label: 'Start' },
      { id: 'end', label: 'End' },
    ],
    edges: [
      { from: 'start', to: 'end', relationship: 'leads-to' },
    ],
  },
  accessibility: { label: 'Test flow' },
};

const CYCLE_WITH_BACK_EDGE: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'back-edge-flow',
  content: {
    kind: 'flow',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [
      { from: 'a', to: 'b', relationship: 'leads-to' },
      { from: 'b', to: 'a', relationship: 'leads-to' },
    ],
  },
  accessibility: { label: 'Back-edge flow' },
};

const UNKNOWN_NODE: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'unknown-ref',
  content: {
    kind: 'flow',
    nodes: [{ id: 'a', label: 'A' }],
    edges: [{ from: 'a', to: 'bogus', relationship: 'leads-to' }],
  },
  accessibility: { label: 'Bad ref' },
};

const NO_RELATIONSHIP: Record<string, unknown> = {
  type: 'diagram',
  version: '1.0.0',
  id: 'no-relationship',
  content: {
    kind: 'flow',
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    edges: [{ from: 'a', to: 'b' }],
  },
  accessibility: { label: 'No relationship' },
};

const CYCLE_KIND_ACYCLIC: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'cycle-but-acyclic',
  content: {
    kind: 'cycle',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [
      { from: 'a', to: 'b', relationship: 'leads-to' },
    ],
  },
  accessibility: { label: 'Acyclic cycle' },
};

describe('validation', () => {
  it('valid flow passes', () => {
    const result = engine.validate(VALID_FLOW as never);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('valid cycle passes', () => {
    const result = engine.validate(VALID_CYCLE as never);
    expect(result.valid).toBe(true);
  });

  it('flow with back-edge fails INVALID_ENTITY', () => {
    const result = engine.validate(CYCLE_WITH_BACK_EDGE as never);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('INVALID_ENTITY');
  });

  it('edge from unknown node fails INVALID_REFERENCE', () => {
    const result = engine.validate(UNKNOWN_NODE as never);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('INVALID_REFERENCE');
  });

  it('edge without relationship fails at schema level', () => {
    const result = engine.validate(NO_RELATIONSHIP as never);
    expect(result.valid).toBe(false);
  });

  it('cycle kind without cycle fails INVALID_ENTITY', () => {
    const result = engine.validate(CYCLE_KIND_ACYCLIC as never);
    expect(result.valid).toBe(false);
  });
});