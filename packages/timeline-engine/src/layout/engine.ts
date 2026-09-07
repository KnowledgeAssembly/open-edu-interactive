import type { Scene, SceneNode } from '../scene/types.js';
import { timeScale, niceYearTicks } from './time.js';
import { rect } from './lanes.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

function nodeBounds(nodes: SceneNode[], kind: string): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of nodes) {
    if (n.kind === kind) {
      const d = n.metadata?.date as number | undefined;
      if (d !== undefined) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
    }
  }
  return [lo === Infinity ? 0 : lo, hi === -Infinity ? 1 : hi];
}

function periodBounds(nodes: SceneNode[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of nodes) {
    if (n.kind === 'period-band') {
      const f = n.metadata?.fromDay as number | undefined;
      const t = n.metadata?.toDay as number | undefined;
      if (f !== undefined) lo = Math.min(lo, f);
      if (t !== undefined) hi = Math.max(hi, t);
    }
  }
  return [lo === Infinity ? 0 : lo, hi === -Infinity ? 1 : hi];
}

export function layout(scene: Scene, ctx: LayoutContext): Scene {
  const pad = { top: 20, right: 20, bottom: 60, left: 100 };
  const plotX = pad.left;
  const plotW = ctx.width - pad.left - pad.right;

  const markers = scene.nodes.filter((n) => n.kind === 'event-marker');
  const periods = scene.nodes.filter((n) => n.kind === 'period-band');
  const tracks = scene.nodes.filter((n) => n.kind === 'track-lane');

  const markerDomain = nodeBounds(markers, 'event-marker');
  const periodDomain = periodBounds(periods);
  const domain: [number, number] = [
    Math.min(markerDomain[0], periodDomain[0]),
    Math.max(markerDomain[1], periodDomain[1]),
  ];
  if (domain[1] <= domain[0]) domain[1] = domain[0] + 1;

  const ticks = niceYearTicks(domain[0], domain[1]);
  const xScale = timeScale(ticks.domain, [plotX, plotX + plotW]);

  const plotY = pad.top;
  const laneCount = tracks.length;
  const laneH = Math.max(60, ctx.minTouchTarget);
  const plotH = laneCount * laneH;

  for (const [i, track] of tracks.entries()) {
    const y = plotY + i * laneH;
    track.bounds = rect(plotX, y, plotW, laneH);
  }

  for (const marker of markers) {
    const d = marker.metadata?.date as number | undefined;
    if (d === undefined) continue;
    const x = xScale(d);
    const trackId = marker.metadata?.trackId as string | undefined;
    const trackIdx = tracks.findIndex((t) => t.id === `track-${trackId}` || (trackId === 'track-default' && t.id === 'track-track-default'));
    const idx = trackIdx >= 0 ? trackIdx : 0;
    const y = plotY + idx * laneH + laneH / 2;
    const size = Math.max(ctx.minTouchTarget, 16);
    marker.bounds = rect(x - size / 2, y - size / 2, size, size);
  }

  for (const period of periods) {
    const f = period.metadata?.fromDay as number | undefined;
    const t = period.metadata?.toDay as number | undefined;
    if (f === undefined || t === undefined) continue;
    const x0 = xScale(f);
    const x1 = xScale(t);
    period.bounds = rect(x0, plotY, x1 - x0, plotH);
  }

  const gridNodes: SceneNode[] = [];
  const tickNodes: SceneNode[] = [];
  const labelNodes: SceneNode[] = [];

  for (const [i, t] of ticks.ticks.entries()) {
    const x = xScale(t);
    const gId = `gridline-${i}`;
    gridNodes.push({ id: gId, role: 'gridline', kind: 'line', value: t, children: [] });
    const tkId = `tick-${i}`;
    tickNodes.push({
      id: tkId, role: 'tick', kind: 'tick', value: t,
      bounds: rect(x - 1, plotY + plotH, 2, 6), children: [],
    });
    const lbId = `label-tick-${i}`;
    labelNodes.push({
      id: lbId, role: 'label', kind: 'text', value: t, label: String(t),
      bounds: rect(x - 30, plotY + plotH + 8, 60, 18), children: [],
    });
  }

  for (const [i, track] of tracks.entries()) {
    const y = plotY + i * laneH + laneH / 2;
    const lbId = `label-track-${track.id.replace('track-', '')}`;
    labelNodes.push({
      id: lbId, role: 'label', kind: 'text',
      label: track.label,
      bounds: rect(4, y - 10, pad.left - 8, 20), children: [],
    });
  }

  scene.nodes = [
    ...gridNodes,
    ...tickNodes,
    ...labelNodes,
    ...tracks,
    ...periods,
    ...markers,
  ];

  return scene;
}