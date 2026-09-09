import { Link } from "react-router-dom";
import { getCatalog, type FixtureEntry } from "../lib/specLoader.js";
import { useState } from "react";

export function HomePage(): React.JSX.Element {
  const catalog = getCatalog();
  const [query, setQuery] = useState("");
  const filtered = catalog.filter((c: FixtureEntry) =>
    c.id.includes(query) ||
    (c.title ?? "").toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase())
  );
  const grouped = new Map<string, typeof filtered>();
  for (const item of filtered) {
    const key = item.kind === "composition" ? "Lessons" : `${item.engine ?? "?"} engine`;
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }

  return (
    <div>
      <h1>OpenEdu Playground</h1>
      <input
        placeholder="Search fixtures…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 16, boxSizing: "border-box" }}
      />
      {[...grouped.entries()].map(([group, items]) => (
        <section key={group} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, borderBottom: "1px solid #ddd", paddingBottom: 4 }}>{group} ({items.length})</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {items.map((c) => (
              <li key={c.id} style={{ marginBottom: 4 }}>
                <Link to={c.kind === "composition" ? `/lesson/${c.slug}` : `/engine/${c.engine}/${c.slug}`} style={{ color: "#0366d6", textDecoration: "none" }}>
                  {c.title ?? c.slug}
                </Link>
                <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{c.id}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {filtered.length === 0 && <p>No fixtures match "{query}".</p>}
    </div>
  );
}