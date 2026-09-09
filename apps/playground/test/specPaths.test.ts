import { describe, it, expect } from "vitest";
import { encodeSpecHash, decodeSpecHash } from "../src/lib/specPaths.js";

describe("specPaths", () => {
  it("round-trips spec hash encoding", () => {
    const json = '{"type":"visual","id":"demo","title":"Hello 🌍"}';
    const hash = encodeSpecHash(json);
    expect(decodeSpecHash(hash)).toBe(json);
  });
});
