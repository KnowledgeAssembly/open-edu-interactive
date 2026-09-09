import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
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
    fs: { allow: [repoRoot] },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
