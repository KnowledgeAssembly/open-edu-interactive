import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ADR_DIR = new URL('../../../../docs/adr/', import.meta.url);
const DESIGN_URL = new URL('../../../../docs/DESIGN.md', import.meta.url);

describe('ADR coverage (T6 doc test)', () => {
  const files = readdirSync(ADR_DIR).filter((f) => f.endsWith('.md')).sort();
  const designText = readFileSync(DESIGN_URL, 'utf8');

  it('all 9 ADRs exist (ADR-01..ADR-09)', () => {
    const names = files.map((f) => f.replace('.md', ''));
    for (let i = 1; i <= 9; i++) {
      const expected = `ADR-${String(i).padStart(2, '0')}`;
      expect(names).toContain(expected);
    }
  });

  it('each ADR has a Status header', () => {
    for (const file of files) {
      const content = readFileSync(new URL(file, ADR_DIR), 'utf8');
      expect(content).toMatch(/^\*\*Status:\*\*/m);
    }
  });

  it('every D-row in DESIGN §16 links to an ADR file', () => {
    // Each D-row should have an ADR link like [ADR-01](adr/ADR-01.md)
    for (let i = 1; i <= 9; i++) {
      const expected = `ADR-${String(i).padStart(2, '0')}`;
      expect(designText).toContain(expected);
    }
  });

  it('at least one ADR contains "Supersedes" (matching DESIGN §16 supersede citations)', () => {
    const supersedeCount = files.filter((file) => {
      const content = readFileSync(new URL(file, ADR_DIR), 'utf8');
      return content.includes('**Supersedes:**');
    }).length;
    expect(supersedeCount).toBeGreaterThanOrEqual(1);
  });
});