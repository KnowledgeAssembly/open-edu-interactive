import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm --filter @knowledgeassemble/conformance dev',
    port: 5173,
    reuseExistingServer: true,
  },
});