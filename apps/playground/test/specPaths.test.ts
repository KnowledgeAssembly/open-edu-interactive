import { describe, it, expect } from "vitest";
import {
  catalogPathFromGlobKey,
  globKeyForCatalogPath,
  unwrapSpecModule,
  encodeSpecHash,
  decodeSpecHash,
} from "../src/lib/specPaths.js";

describe("specPaths", () => {
  it("maps catalog paths to glob keys and back", () => {
    const catalogPath = "packages/visual-engine/fixture/number-line/input.visual.json";
    const globKey = globKeyForCatalogPath(catalogPath);
    expect(globKey).toBe("../../../../packages/visual-engine/fixture/number-line/input.visual.json");
    expect(catalogPathFromGlobKey(globKey)).toBe(catalogPath);
  });

  it("unwraps vite json module default export", () => {
    const spec = { type: "visual", id: "x" };
    expect(unwrapSpecModule({ default: spec })).toBe(spec);
    expect(unwrapSpecModule(spec)).toBe(spec);
  });

  it("round-trips spec hash encoding", () => {
    const json = '{"type":"visual","id":"demo","title":"Hello 🌍"}';
    const hash = encodeSpecHash(json);
    expect(decodeSpecHash(hash)).toBe(json);
  });
});
