import { execSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;

function run(command, opts = {}) {
  return execSync(command, { cwd: ROOT, encoding: 'utf8', ...opts });
}

console.log('[check-engine-skills-fresh] regenerating skill artifacts');
run('pnpm --filter @knowledgeassemble/engine-skills generate');

console.log('[check-engine-skills-fresh] checking for drift (git status --porcelain)');
const statusOutput = run('git status --porcelain -- packages/engine-skills/manifest.json packages/engine-skills/skills/');
if (statusOutput.trim()) {
  console.error('[check-engine-skills-fresh] FAILED: git status --porcelain found untracked or modified files after regeneration');
  console.error(statusOutput);
  process.exit(1);
}
console.log('[check-engine-skills-fresh] no untracked/modified files');

console.log('[check-engine-skills-fresh] checking for diff in tracked files');
try {
  run('git diff --exit-code packages/engine-skills/manifest.json packages/engine-skills/skills/');
  console.log('[check-engine-skills-fresh] no diff — artifacts are fresh');
} catch {
  console.error('[check-engine-skills-fresh] FAILED: regeneration produced a diff in tracked files');
  process.exit(1);
}

console.log('[check-engine-skills-fresh] PASSED');