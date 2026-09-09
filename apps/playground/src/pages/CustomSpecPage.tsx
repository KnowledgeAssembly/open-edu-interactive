import { useState, useRef, useEffect } from "react";
import { mountEngine, validateSpec } from "@knowledgeassemble/dev-harness";
import type { EngineType } from "@knowledgeassemble/interactive-engine";
import { getEngineTypes } from "../lib/specLoader.js";
import { decodeSpecHash, encodeSpecHash } from "../lib/specPaths.js";
import { formatValidationIssues } from "../lib/inspectorHelpers.js";

const STORAGE_KEY = "playground:custom-spec";

function readDraft(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function persistDraft(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* quota */
  }
}

function detectEngineType(spec: unknown): EngineType | null {
  const type = (spec as { type?: string }).type;
  const match = getEngineTypes().find((t) => t === type);
  return match ? (match as EngineType) : null;
}

export function CustomSpecPage(): React.JSX.Element {
  const [json, setJson] = useState<string>(readDraft);
  const [error, setError] = useState<string>("");
  const [validation, setValidation] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<{
    teardown: () => void;
    snapshot: () => unknown;
    events: () => readonly { seq: number; name: string }[];
    validate: (spec: unknown) => { issues: { code: string; message: string }[] };
  } | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#spec=")) return;
    try {
      const decoded = decodeSpecHash(hash);
      setJson(decoded);
      persistDraft(decoded);
    } catch {
      setError("Invalid spec hash in URL");
    }
  }, []);

  useEffect(() => {
    return () => {
      resultRef.current?.teardown();
    };
  }, []);

  function parseSpec(): unknown | null {
    try {
      return JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return null;
    }
  }

  function handleValidate(): void {
    const spec = parseSpec();
    if (!spec) return;
    const engineType = detectEngineType(spec);
    if (!engineType) {
      setValidation("Cannot auto-detect engine type");
      return;
    }
    const v = validateSpec(spec as never, engineType);
    setValidation(formatValidationIssues(v.issues));
    setError("");
    persistDraft(json);
  }

  function handleMount(): void {
    const spec = parseSpec();
    if (!spec) return;
    const engineType = detectEngineType(spec);
    if (!engineType) {
      setError("Cannot auto-detect engine type; set spec.type to one of: " + getEngineTypes().join(", "));
      return;
    }
    const v = validateSpec(spec as never, engineType);
    if (v.issues.length > 0) {
      setValidation(formatValidationIssues(v.issues));
      setError("Fix validation issues before mounting");
      return;
    }
    setError("");
    persistDraft(json);
    resultRef.current?.teardown();
    containerRef.current?.replaceChildren();
    try {
      const result = mountEngine(spec as never, containerRef.current!, { instanceId: "custom" });
      resultRef.current = result;
      setValidation("Valid");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleShare(): void {
    const hash = encodeSpecHash(json);
    window.location.hash = hash;
    navigator.clipboard?.writeText(window.location.href);
  }

  function handleLoadHash(): void {
    const hash = window.location.hash;
    if (!hash.startsWith("#spec=")) {
      setError("No #spec= hash in URL");
      return;
    }
    try {
      const decoded = decodeSpecHash(hash);
      setJson(decoded);
      persistDraft(decoded);
      setError("");
    } catch {
      setError("Invalid spec hash");
    }
  }

  function handleClear(): void {
    localStorage.removeItem(STORAGE_KEY);
    setJson("{}");
    setValidation("");
    setError("");
    resultRef.current?.teardown();
    resultRef.current = null;
    containerRef.current?.replaceChildren();
    window.location.hash = "";
  }

  return (
    <div>
      <h2>Custom Spec</h2>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        style={{ width: "100%", height: 200, fontFamily: "monospace", fontSize: 12 }}
        spellCheck={false}
      />
      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button type="button" onClick={handleValidate}>Validate</button>
        <button type="button" onClick={handleMount}>Mount</button>
        <button type="button" onClick={handleShare}>Share (URL hash)</button>
        <button type="button" onClick={handleLoadHash}>Load from URL hash</button>
        <button type="button" onClick={handleClear}>Clear draft</button>
      </div>
      {error && <div role="alert" style={{ color: "red", marginTop: 8 }}>{error}</div>}
      {validation && (
        <pre style={{ maxHeight: 120, overflow: "auto", fontSize: 12, marginTop: 8, color: validation === "Valid" ? "green" : "red" }}>
          {validation}
        </pre>
      )}
      <div ref={containerRef} data-oedu-root style={{ marginTop: 16 }} />
    </div>
  );
}
