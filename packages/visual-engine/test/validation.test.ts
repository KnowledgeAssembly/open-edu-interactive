import { describe, expect, it } from 'vitest';
import { validateSemantic } from '../src/validation/semantic.js';
import { validateLayout } from '../src/validation/layout.js';
import { validateAccessibility } from '../src/validation/accessibility.js';
import type { VisualSpec } from '../src/schema.js';

const VALID_SPEC: VisualSpec = {
  type: 'visual',
  version: '1.0.0',
  id: 'test-nl',
  content: {
    kind: 'number-line',
    range: { min: 0, max: 10, step: 1 },
    highlight: [7],
    components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
  },
  accessibility: { label: 'Number line', description: '7 is highlighted' },
};

describe('validateSemantic (L2)', () => {
  it('passes on valid number-line spec', () => {
    const result = validateSemantic(VALID_SPEC);
    expect(result.valid).toBe(true);
  });

  it('rejects unknown kind', () => {
    const result = validateSemantic({ ...VALID_SPEC, content: { ...VALID_SPEC.content, kind: 'timeline' as never } });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_ENTITY');
  });

  it('rejects broken relationship reference', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        ...VALID_SPEC.content,
        elements: [{ id: 'a', type: 'circle' }],
        relationships: [{ type: 'labels', source: 'a', target: 'nonexistent' }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_REFERENCE');
  });

  it('rejects invalid action in acceptsActions', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        ...VALID_SPEC.content,
        elements: [{ id: 'x', type: 'circle', interactive: true, acceptsActions: ['invalid-action' as never] }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_ACTION');
  });
});

describe('validateAccessibility (L4)', () => {
  it('passes when accessibility label is present', () => {
    const result = validateAccessibility(VALID_SPEC);
    expect(result.valid).toBe(true);
  });

  it('fails when envelope accessibility.label is missing', () => {
    const result = validateAccessibility({ ...VALID_SPEC, accessibility: {} });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('ACCESSIBILITY_ERROR');
  });

  it('fails on color-only interactive element without role', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        ...VALID_SPEC.content,
        elements: [{ id: 'x', type: 'circle', interactive: true, style: { fill: 'red' } }],
      },
    };
    const result = validateAccessibility(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('ACCESSIBILITY_ERROR');
  });
});

describe('validateLayout (L3)', () => {
  it('passes on typical number-line', () => {
    const result = validateLayout(VALID_SPEC);
    expect(result.valid).toBe(true);
  });
});