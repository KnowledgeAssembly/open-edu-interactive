import { describe, it, expect } from 'vitest';
import { MANIFEST, loadSkillDoc } from '../src/manifest.js';

describe('published SKILL.md portability', () => {
  for (const e of MANIFEST.engines) {
    it(`${e.type} SKILL.md contains no in-repo paths`, () => {
      const doc = loadSkillDoc(e.type);
      expect(doc).not.toContain('packages/');
      expect(doc).not.toContain('docs/');
    });
  }
});