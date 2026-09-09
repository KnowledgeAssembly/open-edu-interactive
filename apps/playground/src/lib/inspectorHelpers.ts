import { a11yTreeOf, type A11yNode } from "@knowledgeassemble/interactive-engine";

export function formatValidationIssues(issues: { code: string; message: string }[]): string {
  return issues.length === 0 ? "Valid" : issues.map((i) => `[${i.code}] ${i.message}`).join("\n");
}

export function formatEvents(events: readonly { seq: number; name: string }[]): string[] {
  return events.map((e) => `${e.seq}: ${e.name}`);
}

export function a11yTreeFromSnapshot(snapshot: unknown): A11yNode | null {
  try {
    return a11yTreeOf(snapshot as never);
  } catch {
    return null;
  }
}

export async function waitForInstances(getInstances: () => string[], maxFrames = 120): Promise<boolean> {
  for (let i = 0; i < maxFrames; i++) {
    if (getInstances().length > 0) return true;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return getInstances().length > 0;
}
