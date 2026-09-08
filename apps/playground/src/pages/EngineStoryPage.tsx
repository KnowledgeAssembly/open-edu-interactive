import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { mountEngine } from "@knowledgeassemble/dev-harness";
import { loadSpec, getCatalog, type FixtureEntry } from "../lib/specLoader.js";

export function EngineStoryPage(): React.JSX.Element {
  const { engine, slug } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<{ teardown: () => void; snapshot: () => unknown; events: () => readonly { seq: number; name: string }[]; validate: (spec: unknown) => { issues: { code: string; message: string }[] } } | null>(null);
  const [snapshot, setSnapshot] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !engine || !slug) return;
    const entry = getCatalog().find((c: FixtureEntry) => c.kind === "engine" && c.engine === engine && c.slug === slug);
    if (!entry) { setError(`Fixture not found: ${engine}/${slug}`); return; }
    resultRef.current?.teardown();
    try {
      const spec = loadSpec(entry.specPath);
      const result = mountEngine(spec as never, containerRef.current);
      resultRef.current = result;
      setSnapshot(JSON.stringify(result.snapshot(), null, 2));
      setValidationIssues("");
      setEvents([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => { resultRef.current?.teardown(); resultRef.current = null; };
  }, [engine, slug]);

  const entry = getCatalog().find((c: FixtureEntry) => c.kind === "engine" && c.engine === engine && c.slug === slug);

  return (
    <div>
      <h2>{engine}/{slug}</h2>
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <div ref={containerRef} data-oedu-root />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => { if (!resultRef.current) return; setEvents(resultRef.current.events().map((e, i) => `${e.seq}: ${e.name}`)); }}>Refresh Events</button>
        <button onClick={() => { if (!resultRef.current) return; setSnapshot(JSON.stringify(resultRef.current.snapshot(), null, 2)); }}>Refresh Snapshot</button>
        {entry && <button onClick={() => { if (!resultRef.current) return; const v = resultRef.current.validate(loadSpec(entry.specPath) as never); setValidationIssues(v.issues.map((i: { code: string; message: string }) => `[${i.code}] ${i.message}`).join("\n") || "Valid"); }}>Validate</button>}
      </div>
      <details style={{ marginTop: 8 }}>
        <summary>Events ({events.length})</summary>
        <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>{events.join("\n")}</pre>
      </details>
      <details style={{ marginTop: 8 }}>
        <summary>Snapshot</summary>
        <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>{snapshot}</pre>
      </details>
      {validationIssues && (
        <details style={{ marginTop: 8 }}>
          <summary>Validation</summary>
          <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12, color: validationIssues === "Valid" ? "green" : "red" }}>{validationIssues}</pre>
        </details>
      )}
    </div>
  );
}