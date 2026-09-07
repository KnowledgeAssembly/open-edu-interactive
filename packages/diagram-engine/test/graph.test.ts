import { describe, it, expect } from 'vitest';
import { adjacency, kahnTopoSort, detectCycles } from '../src/layout/graph.js';

const WATER_CYCLE_NODES = ['evaporation', 'condensation', 'precipitation', 'collection'];
const WATER_CYCLE_EDGES = [
  { from: 'evaporation', to: 'condensation' },
  { from: 'condensation', to: 'precipitation' },
  { from: 'precipitation', to: 'collection' },
  { from: 'collection', to: 'evaporation' },
];

const DAG_NODES = ['start', 'step1', 'step2', 'end'];
const DAG_EDGES = [
  { from: 'start', to: 'step1' },
  { from: 'start', to: 'step2' },
  { from: 'step1', to: 'end' },
  { from: 'step2', to: 'end' },
];

describe('graph analysis', () => {
  it('adjacency builds correct map', () => {
    const g = adjacency(WATER_CYCLE_NODES, WATER_CYCLE_EDGES);
    expect(g.adjacency.get('evaporation')).toEqual(['condensation']);
    expect(g.adjacency.get('collection')).toEqual(['evaporation']);
  });

  it('kahnTopoSort detects cycle in water cycle', () => {
    const g = adjacency(WATER_CYCLE_NODES, WATER_CYCLE_EDGES);
    const sorted = kahnTopoSort(g);
    expect(sorted).toBeNull();
  });

  it('kahnTopoSort returns valid order for DAG', () => {
    const g = adjacency(DAG_NODES, DAG_EDGES);
    const sorted = kahnTopoSort(g);
    expect(sorted).not.toBeNull();
    // start should be first, end should be last
    expect(sorted![0]).toBe('start');
    expect(sorted![3]).toBe('end');
  });

  it('detectCycles finds cycle in water cycle', () => {
    const g = adjacency(WATER_CYCLE_NODES, WATER_CYCLE_EDGES);
    const { cycles, hasCycle } = detectCycles(g);
    expect(hasCycle).toBe(true);
    expect(cycles.length).toBeGreaterThanOrEqual(1);
  });

  it('detectCycles finds no cycle in DAG', () => {
    const g = adjacency(DAG_NODES, DAG_EDGES);
    const { hasCycle } = detectCycles(g);
    expect(hasCycle).toBe(false);
  });

  it('determinism: two calls produce same result', () => {
    const g = adjacency(WATER_CYCLE_NODES, WATER_CYCLE_EDGES);
    const r1 = detectCycles(g);
    const r2 = detectCycles(g);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('self-loop detected as cycle', () => {
    const g = adjacency(['a'], [{ from: 'a', to: 'a' }]);
    const { hasCycle, cycles } = detectCycles(g);
    expect(hasCycle).toBe(true);
    expect(cycles).toHaveLength(1);
  });
});