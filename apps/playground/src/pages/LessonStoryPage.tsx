import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { mountLesson } from "@knowledgeassemble/dev-harness";
import { loadSpec, getCatalog, type FixtureEntry } from "../lib/specLoader.js";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !slug) return;
    const entry = getCatalog().find((c: FixtureEntry) => c.kind === "composition" && c.slug === slug);
    if (!entry) { setError(`Lesson not found: ${slug}`); return; }
    resultRef.current?.teardown();
    try {
      const lesson = loadSpec(entry.specPath);
      const result = mountLesson(lesson as never, containerRef.current) as typeof resultRef.current;
      resultRef.current = result!;
      setSnapshot(JSON.stringify(resultRef.current.snapshot(resultRef.current.instances()[0] ?? ""), null, 2));
      setEvents([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => { resultRef.current?.teardown(); resultRef.current = null; };
  }, [slug]);

  return (
    <div>
      <h2>Lesson: {slug}</h2>
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <div ref={containerRef} data-oedu-root />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => { if (!resultRef.current) return; setEvents(resultRef.current.events().map((e, i) => `${e.seq}: ${e.name}`)); }}>Refresh Events</button>
        <button onClick={() => { if (!resultRef.current) return; setSnapshot(JSON.stringify(resultRef.current.snapshot(resultRef.current.instances()[0]!), null, 2)); }}>Refresh Snapshot</button>
      </div>
      <details style={{ marginTop: 8 }}>
        <summary>Events ({events.length})</summary>
        <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>{events.join("\n")}</pre>
      </details>
      <details style={{ marginTop: 8 }}>
        <summary>Snapshot</summary>
        <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>{snapshot}</pre>
      </details>
    </div>
  );
}