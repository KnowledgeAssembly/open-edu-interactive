import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { mountLesson } from "@knowledgeassemble/dev-harness";
import { a11yTreeOf, type A11yNode } from "@knowledgeassemble/interactive-engine";
import { loadSpec, getCatalog, type FixtureEntry } from "../lib/specLoader.js";

function renderA11yTree(node: A11yNode, depth: number): React.JSX.Element {
  return (
    <div key={node.id} style={{ marginLeft: depth * 16, fontSize: 12 }}>
      <span style={{ color: "#666" }}>[{node.role}]</span> {node.label ?? node.id}
      {node.children.map((c) => renderA11yTree(c, depth + 1))}
    </div>
  );
}

export function LessonStoryPage(): React.JSX.Element {
  const { slug } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<{
    dispatch: (instanceId: string, action: unknown) => void;
    snapshot: (instanceId: string) => unknown;
    events: () => readonly { seq: number; name: string }[];
    instances: () => string[];
    teardown: () => void;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [a11yTree, setA11yTree] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !slug) return;
    const entry = getCatalog().find((c: FixtureEntry) => c.kind === "composition" && c.slug === slug);
    if (!entry) { setError(`Lesson not found: ${slug}`); return; }
    const specPath = entry.specPath;
    resultRef.current?.teardown();
    let cancelled = false;
    async function mount(): Promise<void> {
      try {
        const lesson = loadSpec(specPath);
        const result = mountLesson(lesson as never, containerRef.current!) as typeof resultRef.current;
        if (cancelled) { result?.teardown(); return; }
        resultRef.current = result;
        let attempts = 0;
        while (!resultRef.current?.instances().length && attempts < 100) {
          await new Promise((r) => setTimeout(r, 50));
          attempts++;
        }
        if (cancelled || !resultRef.current) return;
        setSnapshot(JSON.stringify(resultRef.current.snapshot(resultRef.current.instances()[0] ?? ""), null, 2));
        setEvents([]);
        setA11yTree("");
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    mount();
    return () => { cancelled = true; resultRef.current?.teardown(); resultRef.current = null; };
  }, [slug]);

  function refreshEvents(): void {
    if (!resultRef.current) return;
    setEvents(resultRef.current.events().map((e, i) => `${e.seq}: ${e.name}`));
    const snap = resultRef.current.snapshot(resultRef.current.instances()[0] ?? "");
    setSnapshot(JSON.stringify(snap, null, 2));
    try {
      const tree = a11yTreeOf(snap as never);
      setA11yTree(JSON.stringify(tree, null, 2));
    } catch { /* no state */ }
  }

  return (
    <div>
      <h2>Lesson: {slug}</h2>
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <div ref={containerRef} data-oedu-root />
      <div style={{ marginTop: 8 }}>
        <button onClick={refreshEvents}>Refresh Events</button>
        <button onClick={() => { if (!resultRef.current) return; setSnapshot(JSON.stringify(resultRef.current.snapshot(resultRef.current.instances()[0]!), null, 2)); }}>Refresh Snapshot</button>
      </div>
      <InspectorPanel title={`Events (${events.length})`} content={events.join("\n")} />
      <InspectorPanel title="Snapshot" content={snapshot} />
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