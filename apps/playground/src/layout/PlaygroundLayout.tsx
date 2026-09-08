import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { getCatalog, type FixtureEntry } from "../lib/specLoader.js";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/custom", label: "Custom Spec" },
];

export default function PlaygroundLayout(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [inspectTab, setInspectTab] = useState("preview");
  const catalog = getCatalog();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 16px", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
        <strong>Playground</strong>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} style={{ textDecoration: location.pathname === n.to ? "underline" : "none", color: "#0366d6" }}>{n.label}</Link>
        ))}
        <select
          aria-label="Filter by engine"
          onChange={(e) => { if (e.target.value) navigate(`/engine/${e.target.value}/`); }}
          style={{ marginLeft: "auto" }}
        >
          <option value="">All engines</option>
          {[...new Set(catalog.filter((c: FixtureEntry) => c.kind === "engine").map((c: FixtureEntry) => c.engine))].map((e: string | undefined) => (
            <option key={e ?? ""} value={e ?? ""}>{e}</option>
          ))}
        </select>
      </header>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ width: 240, borderRight: "1px solid #ccc", padding: 8, overflowY: "auto", background: "#f5f5f5" }}>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Catalog</summary>
            <ul style={{ listStyle: "none", padding: 0, fontSize: 13, marginTop: 4 }}>
              {catalog.map((c: FixtureEntry) => (
                <li key={c.id}>
                  <Link to={c.kind === "composition" ? `/lesson/${c.slug}` : `/engine/${c.engine}/${c.slug}`} style={{ color: "#0366d6", textDecoration: "none" }}>
                    {c.title ?? c.slug}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </aside>
        <main style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <Outlet />
        </main>
        <aside style={{ width: 360, borderLeft: "1px solid #ccc", padding: 8, overflowY: "auto", background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {(["preview", "events", "snapshot", "validation"] as const).map((t) => (
              <button key={t} onClick={() => setInspectTab(t)} style={{ fontWeight: inspectTab === t ? 700 : 400, textTransform: "capitalize" }}>{t}</button>
            ))}
          </div>
          <div data-inspector-panel>{inspectTab} panel</div>
        </aside>
      </div>
    </div>
  );
}