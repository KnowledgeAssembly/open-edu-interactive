import type { Page } from '@playwright/test';

export interface HarnessEvent {
  seq: number;
  name: string;
  action?: unknown;
}

declare global {
  interface Window {
    __harness?: {
      dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
      snapshot(): unknown;
      events(): Array<HarnessEvent>;
      tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
    };
  }
}

export async function openHarness(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as { __harness?: unknown }).__harness !== undefined);
}