export interface Graph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
}

export function adjacency(
  nodeIds: string[],
  edgeTuples: Array<{ from: string; to: string }>,
): Graph {
  const adj = new Map<string, string[]>();
  const rev = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
    rev.set(id, []);
  }
  for (const e of edgeTuples) {
    const list = adj.get(e.from);
    if (list) list.push(e.to);
    const rlist = rev.get(e.to);
    if (rlist) rlist.push(e.from);
  }
  return { nodes: [...nodeIds], edges: [...edgeTuples], adjacency: adj, reverseAdjacency: rev };
}

export function kahnTopoSort(graph: Graph): string[] | null {
  const inDegree = new Map<string, number>();
  for (const id of graph.nodes) {
    inDegree.set(id, 0);
  }
  for (const tos of graph.adjacency.values()) {
    for (const to of tos) {
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    }
  }

  const queue = [...graph.nodes].filter((id) => (inDegree.get(id) ?? 0) === 0);
  queue.sort();

  const result: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    const neighbors = graph.adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) {
        queue.push(neighbor);
        queue.sort();
      }
    }
  }

  if (result.length !== graph.nodes.length) {
    return null; // cycle detected
  }
  return result;
}

export function detectCycles(graph: Graph): { cycles: string[][]; hasCycle: boolean } {
  // SCC-based cycle detection (Tarjan)
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Map<string, boolean>();
  const stack: string[] = [];
  let currentIndex = 0;
  const sccs: string[][] = [];

  function strongconnect(v: string): void {
    index.set(v, currentIndex);
    lowlink.set(v, currentIndex);
    currentIndex++;
    stack.push(v);
    onStack.set(v, true);

    const neighbors = graph.adjacency.get(v) ?? [];
    for (const w of neighbors) {
      if (!index.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.get(w) === true) {
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        onStack.set(w!, false);
        scc.push(w!);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  const sortedNodes = [...graph.nodes].sort();
  for (const v of sortedNodes) {
    if (!index.has(v)) {
      strongconnect(v);
    }
  }

  // A cycle is an SCC with >1 nodes, OR an SCC with 1 node that has a self-loop
  const cycles: string[][] = [];
  for (const scc of sccs) {
    if (scc.length > 1) {
      cycles.push(scc);
    } else if (scc.length === 1) {
      const v = scc[0]!;
      const neighbors = graph.adjacency.get(v) ?? [];
      if (neighbors.includes(v)) {
        cycles.push(scc);
      }
    }
  }

  return { cycles, hasCycle: cycles.length > 0 };
}