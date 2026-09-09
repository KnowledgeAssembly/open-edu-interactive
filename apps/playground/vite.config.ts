import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const playgroundDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(playgroundDir, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@knowledgeassemble/dev-harness": path.join(repoRoot, "packages/dev-harness/src/index.ts"),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
});
