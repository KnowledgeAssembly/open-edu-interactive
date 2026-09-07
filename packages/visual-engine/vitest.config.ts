import { defineConfig } from 'vitest/config';
import type { PlaywrightTestConfig } from '@playwright/test';

export const playwrightConfig: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm --filter @knowledgeassemble/conformance dev',
    port: 5173,
    reuseExistingServer: true,
  },
};

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});