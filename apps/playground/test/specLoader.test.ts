import { describe, it, expect } from "vitest";
import { loadSpec, getCatalog } from "../src/lib/specLoader.js";

describe("specLoader", () => {
  it("loads engine fixtures by catalog specPath", () => {
    const entry = getCatalog().find((e) => e.id === "visual/number-line");
    expect(entry).toBeDefined();
    const spec = loadSpec(entry!.specPath) as { type?: string };
    expect(spec.type).toBe("visual");
  });

  it("loads docs composition fixtures", () => {
    const entry = getCatalog().find((e) => e.id === "lesson/narrative-timeline-visual");
    expect(entry).toBeDefined();
    expect(loadSpec(entry!.specPath)).toBeTruthy();
  });
});
