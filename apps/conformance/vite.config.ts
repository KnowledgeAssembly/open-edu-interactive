import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const conformanceDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(conformanceDir, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@knowledgeassemble/dev-harness': path.join(repoRoot, 'packages/dev-harness/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
});
