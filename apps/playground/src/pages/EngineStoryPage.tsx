import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { mountEngine } from "@knowledgeassemble/dev-harness";
import { a11yTreeOf, type A11yNode } from "@knowledgeassemble/interactive-engine";
import { loadSpec, getCatalog, type FixtureEntry } from "../lib/specLoader.js";

function jsonClone(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v));
}

function renderA11yTree(node: A11yNode, depth: number): React.JSX.Element {
  return (
    <div key={node.id} style={{ marginLeft: depth * 16, fontSize: 12 }}>
      <span style={{ color: "#666" }}>[{node.role}]</span> {node.label ?? node.id}
      {node.children.map((c) => renderA11yTree(c, depth + 1))}
    </div>
  );
}

export function EngineStoryPage(): React.JSX.Element {
  const { engine, slug } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<{ teardown: () => void; snapshot: () => unknown; events: () => readonly { seq: number; name: string; action?: unknown }[]; validate: (spec: unknown) => { issues: { code: string; message: string }[] }; dispatch: (action: unknown) => void } | null>(null);
  const [snapshotJson, setSnapshotJson] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string>("");
  const [a11yTree, setA11yTree] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !engine || !slug) return;
    const entry = getCatalog().find((c: FixtureEntry) => c.kind === "engine" && c.engine === engine && c.slug === slug);
    if (!entry) { setError(`Fixture not found: ${engine}/${slug}`); return; }
    resultRef.current?.teardown();
    try {
      const spec = loadSpec(entry.specPath);
      const result = mountEngine(spec as never, containerRef.current);
      resultRef.current = {
        teardown: result.teardown.bind(result),
        snapshot: result.snapshot.bind(result),
        events: result.events.bind(result),
        validate: result.validate.bind(result),
        dispatch: result.dispatch.bind(result) as (action: unknown) => void,
      } as typeof resultRef.current;
      setSnapshotJson(JSON.stringify(result.snapshot(), null, 2));
      setValidationIssues("");
      setEvents([]);
      setA11yTree("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => { resultRef.current?.teardown(); resultRef.current = null; };
  }, [engine, slug]);

  const entry = getCatalog().find((c: FixtureEntry) => c.kind === "engine" && c.engine === engine && c.slug === slug);
  const spec = entry ? (loadSpec(entry.specPath) as Record<string, unknown>) : undefined;
  const actions = (spec?.interaction as { actions?: Array<{ type: string; label?: string }> })?.actions;

  function handleDispatch(actionType: string): void {
    if (!resultRef.current) return;
    const targetId = prompt("Target ID (leave empty if none):", "");
    const action: Record<string, unknown> = { type: actionType };
    if (targetId) action.target = { id: targetId };
    resultRef.current.dispatch(action as never);
    setEvents(resultRef.current.events().map((e, i) => `${e.seq}: ${e.name}`));
    const snap = resultRef.current.snapshot();
    setSnapshotJson(JSON.stringify(snap, null, 2));
    try {
      const tree = a11yTreeOf(snap as never);
      setA11yTree(JSON.stringify(tree, null, 2));
    } catch { /* no state */ }
  }

  return (
    <div>
      <h2>{engine}/{slug}</h2>
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <div ref={containerRef} data-oedu-root />
      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button onClick={() => { if (!resultRef.current) return; setEvents(resultRef.current.events().map((e, i) => `${e.seq}: ${e.name}`)); }}>Refresh Events</button>
        <button onClick={() => { if (!resultRef.current) return; setSnapshotJson(JSON.stringify(resultRef.current.snapshot(), null, 2)); }}>Refresh Snapshot</button>
        {entry && <button onClick={() => { if (!resultRef.current) return; const v = resultRef.current.validate(loadSpec(entry.specPath) as never); setValidationIssues(v.issues.map((i: { code: string; message: string }) => `[${i.code}] ${i.message}`).join("\n") || "Valid"); }}>Validate</button>}
        {actions && actions.map((a) => (
          <button key={a.type} onClick={() => handleDispatch(a.type)}>{a.label ?? a.type}</button>
        ))}
      </div>
      <InspectorPanel title={`Events (${events.length})`} content={events.join("\n")} />
      <InspectorPanel title="Snapshot" content={snapshotJson} />
      {validationIssues && <InspectorPanel title="Validation" content={validationIssues} color={validationIssues === "Valid" ? "green" : "red"} />}
      {a11yTree && <InspectorPanel title="A11y Tree" content={a11yTree} />}
    </div>
  );
}

function InspectorPanel({ title, content, color }: { title: string; content: string; color?: string }): React.JSX.Element {
  const [open, setOpen] = useState(true);
  return (
    <details open={open} style={{ marginTop: 8 }} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{title}</summary>
      <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12, color: color ?? "inherit", whiteSpace: "pre-wrap" }}>{content}</pre>
      <button onClick={() => { navigator.clipboard?.writeText(content); }} style={{ fontSize: 11 }}>Copy JSON</button>
    </details>
  );
}