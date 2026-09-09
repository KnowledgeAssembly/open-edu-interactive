import type { A11yNode } from "@knowledgeassemble/interactive-engine";

function A11yTreeNode({ node, depth }: { node: A11yNode; depth: number }): React.JSX.Element {
  return (
    <div style={{ marginLeft: depth * 16, fontSize: 12 }}>
      <span style={{ color: "#666" }}>[{node.role}]</span> {node.label ?? node.id}
      {node.children.map((child) => (
        <A11yTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function A11yTreeView({ tree }: { tree: A11yNode }): React.JSX.Element {
  return (
    <div style={{ maxHeight: 200, overflow: "auto" }}>
      <A11yTreeNode node={tree} depth={0} />
    </div>
  );
}
