import type { EngineMountResult } from './types.js';

interface EngineSnapshotView {
  svgResult?: {
    svg?: string;
    tabular?: unknown[];
    linear?: unknown[];
    alternative?: unknown[];
  };
  tabular?: unknown[];
  linear?: unknown[];
  alternative?: unknown[];
}

export function engineHarnessExtras(mount: EngineMountResult): Record<string, unknown> {
  const snapshot = (): EngineSnapshotView => mount.snapshot() as EngineSnapshotView;
  return {
    svg(): string {
      return snapshot().svgResult?.svg ?? '';
    },
    tabular(): unknown[] {
      const s = snapshot();
      return s.tabular ?? s.svgResult?.tabular ?? [];
    },
    linear(): unknown[] {
      const s = snapshot();
      return s.linear ?? s.svgResult?.linear ?? [];
    },
    alternative(): unknown[] {
      const s = snapshot();
      return s.alternative ?? s.svgResult?.alternative ?? [];
    },
  };
}
