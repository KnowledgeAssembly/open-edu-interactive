import { useState, useRef, useEffect } from "react";
import { mountEngine, validateSpec } from "@knowledgeassemble/dev-harness";
import { getEngineTypes } from "../lib/specLoader.js";

const STORAGE_KEY = "playground:custom-spec";

export function CustomSpecPage(): React.JSX.Element {
  const [json, setJson] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? "{}"; } catch { return "{}"; }
  });
  const [error, setError] = useState<string>("");
  const [validation, setValidation] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<{ teardown: () => void; snapshot: () => unknown; events: () => readonly { seq: number; name: string }[]; validate: (spec: unknown) => { issues: { code: string; message: string }[] } } | null>(null);

  useEffect(() => {
    return () => { resultRef.current?.teardown(); };
  }, []);

  function persist(value: string): void {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* quota */ }
  }

  function handleMount(): void {
    let spec: unknown;
    try {
      spec = JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const engineType = getEngineTypes().find((t: string) => t === (spec as { type?: string }).type);
    if (!engineType) {
      setError("Cannot auto-detect engine type; set spec.type to one of: " + getEngineTypes().join(", "));
      return;
    }
    setError("");
    persist(json);
    resultRef.current?.teardown();
    try {
      const result = mountEngine(spec as never, containerRef.current!, { instanceId: "custom" });
      resultRef.current = result;
      setValidation("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleValidate(): void {
    let spec: unknown;
    try {
      spec = JSON.parse(json);
    } catch {
      setValidation("Invalid JSON");
      return;
    }
    const engineType = getEngineTypes().find((t: string) => t === (spec as { type?: string }).type);
    if (!engineType) { setValidation("Cannot auto-detect engine type"); return; }
    const v = validateSpec(spec as never, engineType as "visual" | "chart" | "geomap" | "timeline" | "diagram");
    setValidation(v.issues.length === 0 ? "Valid" : v.issues.map((i: { code: string; message: string }) => `[${i.code}] ${i.message}`).join("\n"));
    persist(json);
  }

  function handleShare(): void {
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const hash = `#spec=${encoded}`;
    window.location.hash = hash;
    navigator.clipboard?.writeText(window.location.href);
  }

  function handleLoadHash(): void {
    const hash = window.location.hash;
    if (!hash.startsWith("#spec=")) return;
    try {
      const encoded = hash.slice(6);
      const decoded = decodeURIComponent(escape(atob(encoded)));
      setJson(decoded);
      persist(decoded);
    } catch {
      setError("Invalid spec hash");
    }
  }

  return (
    <div>
      <h2>Custom Spec</h2>
      <textarea value={json} onChange={(e) => setJson(e.target.value)} style={{ width: "100%", height: 200, fontFamily: "monospace", fontSize: 12 }} spellCheck={false} />
      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button onClick={handleValidate}>Validate</button>
        <button onClick={handleMount}>Mount</button>
        <button onClick={handleShare}>Share (URL hash)</button>
        <button onClick={handleLoadHash}>Load from URL hash</button>
        <button onClick={() => { localStorage.removeItem(STORAGE_KEY); setJson("{}"); }}>Clear draft</button>
      </div>
      {error && <div role="alert" style={{ color: "red", marginTop: 8 }}>{error}</div>}
      {validation && (
        <pre style={{ maxHeight: 120, overflow: "auto", fontSize: 12, marginTop: 8, color: validation === "Valid" ? "green" : "red" }}>{validation}</pre>
      )}
      <div ref={containerRef} data-oedu-root style={{ marginTop: 16 }} />
    </div>
  );
}