import { useState, useRef, useEffect } from "react";
import { mountEngine, validateSpec } from "@knowledgeassemble/dev-harness";

function getEngineTypes(): readonly string[] {
  return ["visual", "chart", "geomap", "timeline", "diagram"] as const;
}

export function CustomSpecPage(): React.JSX.Element {
  const [json, setJson] = useState<string>("{}");
  const [error, setError] = useState<string>("");
  const [validation, setValidation] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<{ teardown: () => void; snapshot: () => unknown; events: () => readonly { seq: number; name: string }[]; validate: (spec: unknown) => { issues: { code: string; message: string }[] } } | null>(null);

  useEffect(() => {
    return () => { resultRef.current?.teardown(); };
  }, []);

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
  }

  return (
    <div>
      <h2>Custom Spec</h2>
      <textarea value={json} onChange={(e) => setJson(e.target.value)} style={{ width: "100%", height: 200, fontFamily: "monospace", fontSize: 12 }} spellCheck={false} />
      <div style={{ marginTop: 8 }}>
        <button onClick={handleValidate}>Validate</button>
        <button onClick={handleMount} style={{ marginLeft: 8 }}>Mount</button>
      </div>
      {error && <div role="alert" style={{ color: "red", marginTop: 8 }}>{error}</div>}
      {validation && (
        <pre style={{ maxHeight: 120, overflow: "auto", fontSize: 12, marginTop: 8, color: validation === "Valid" ? "green" : "red" }}>{validation}</pre>
      )}
      <div ref={containerRef} data-oedu-root style={{ marginTop: 16 }} />
    </div>
  );
}