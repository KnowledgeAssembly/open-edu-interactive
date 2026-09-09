import { useState, type ReactNode } from "react";

export function InspectorPanel({
  title,
  content,
  children,
  color,
  copyLabel = "Copy",
}: {
  title: string;
  content?: string;
  children?: ReactNode;
  color?: string;
  copyLabel?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(true);
  const copyText = content ?? "";

  return (
    <details open={open} style={{ marginTop: 8 }} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{title}</summary>
      {children ?? (
        <pre style={{ maxHeight: 200, overflow: "auto", fontSize: 12, color: color ?? "inherit", whiteSpace: "pre-wrap" }}>
          {content}
        </pre>
      )}
      {copyText && (
        <button type="button" onClick={() => { navigator.clipboard?.writeText(copyText); }} style={{ fontSize: 11 }}>
          {copyLabel}
        </button>
      )}
    </details>
  );
}
