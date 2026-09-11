import { geoDistance } from 'd3-geo';
import type { Scene, SceneNode } from './types.js';
import type { Projector } from '../layout/projection.js';
import { rect } from '../layout/geometry.js';

export interface DisplayMaps {
  hiddenLayerIds: Set<string>;
  shownLayerIds: Set<string>;
  activeRouteSteps: Record<string, number>;
  filterCategories: string[];
  filterIds: string[] | null;
  legendEntities: string[];
}

export interface ScaleBarConfig {
  lengthKm: number;
  lengthPx: number;
  unit: 'km' | 'mi';
  label: string;
}

const NICE_PATTERN = [1, 2, 5];

function pickNiceLength(targetPx: number, kmPerPx: number, unit: 'km' | 'mi'): { lengthKm: number; lengthPx: number; unit: 'km' | 'mi'; label: string } {
  const targetKm = targetPx * kmPerPx;
  const magnitude = Math.pow(10, Math.floor(Math.log10(targetKm)));
  let bestKm = targetKm;
  let bestDiff = Infinity;
  for (const n of NICE_PATTERN) {
    const candidate = n * magnitude;
    const diff = Math.abs(candidate - targetKm) / targetKm;
    if (diff < bestDiff) {
      bestKm = candidate;
      bestDiff = diff;
    }
    const candidate2 = n * magnitude * 10;
    const diff2 = Math.abs(candidate2 - targetKm) / targetKm;
    if (diff2 < bestDiff) {
      bestKm = candidate2;
      bestDiff = diff2;
    }
  }
  const lengthPx = (bestKm / targetKm) * targetPx;
  const unitLabel = unit;
  if (unit === 'mi') {
    bestKm = bestKm * 0.621371;
  }
  const label = `${Math.round(bestKm)} ${unitLabel.toUpperCase()}`;
  return { lengthKm: bestKm, lengthPx: Math.round(lengthPx), unit: unitLabel, label };
}

export function computeScaleBar(
  ctx: { width: number; height: number },
  centerLat: number,
  projector: Projector,
  unit: 'km' | 'mi' = 'km',
): ScaleBarConfig {
  const targetPx = ctx.width / 4;
  const pxPerRad = projector.scale;
  if (pxPerRad <= 0) {
    return { lengthKm: 0, lengthPx: 0, unit, label: '' };
  }
  const pxPerDeg = pxPerRad * (Math.PI / 180);
  const distRad = geoDistance([0, centerLat], [1, centerLat]);
  if (distRad === 0) {
    return { lengthKm: 0, lengthPx: 0, unit, label: '' };
  }
  const kmPerDeg = distRad * 6371;
  const kmPerPx = kmPerDeg / pxPerDeg;
  return pickNiceLength(targetPx, kmPerPx, unit);
}

export function makeScaleBarNode(config: ScaleBarConfig, minTouchTarget: number, canvasHeight: number): SceneNode {
  const x = 24;
  const y = canvasHeight - 44 - minTouchTarget;
  return {
    id: 'geom-scale-bar',
    role: 'scale-bar',
    kind: 'scale-bar',
    label: config.label,
    bounds: { x, y, width: config.lengthPx + 6, height: 24 + minTouchTarget },
    interactive: false,
    metadata: { ...config, scaleBarKind: 'scale-bar' },
    children: [],
  };
}

export function cloneScene(base: Scene): Scene {
  return structuredClone(base) as Scene;
}

function walkNodes(nodes: SceneNode[], fn: (node: SceneNode, parent?: SceneNode) => void, parent?: SceneNode): void {
  for (const node of nodes) {
    fn(node, parent);
    walkNodes(node.children, fn, node);
  }
}

export function bucketIndex(value: number, breakpoints: Array<[number, number]>): number {
  if (breakpoints.length === 0) return 1;
  for (let i = 0; i < breakpoints.length; i++) {
    const [lo, hi] = breakpoints[i]!;
    if (value >= lo && value < hi) return i + 1;
  }
  const lastLo = breakpoints[breakpoints.length - 1]![0];
  return value < lastLo ? 1 : breakpoints.length;
}

function applyEncoding(display: Scene): void {
  walkNodes(display.nodes, (node) => {
    const meta = node.metadata;
    if (!meta) return;
    const breakpoints = meta.encodingBreakpoints as Array<[number, number]> | undefined;
    const value = meta.measureValue as number | undefined;
    if (Array.isArray(breakpoints) && value !== undefined && Number.isFinite(value)) {
      const idx = bucketIndex(value, breakpoints);
      meta.encodingBucket = `encoding-bucket-${idx}`;
    }
  });
}

export function deriveDisplay(maps: DisplayMaps, base: Scene, scaleBarNode?: SceneNode): Scene {
  const display = cloneScene(base);

  const { hiddenLayerIds, shownLayerIds, activeRouteSteps, filterIds, legendEntities } = maps;

  walkNodes(display.nodes, (node) => {
    if (node.kind === 'layer') {
      if (shownLayerIds.has(node.id)) {
        node.hidden = false;
        walkNodes(node.children, (child) => {
          child.hidden = false;
        });
      } else if (hiddenLayerIds.has(node.id)) {
        node.hidden = true;
        walkNodes(node.children, (child) => {
          child.hidden = true;
        });
      }
    }
  });

  if (filterIds !== null) {
    walkNodes(display.nodes, (node) => {
      if (node.role === 'region' || node.role === 'marker' || node.role === 'label' || node.role === 'route-segment') {
        if (!filterIds.includes(node.id)) {
          node.hidden = true;
        }
      }
    });
  }

  for (const [routeNodeId, step] of Object.entries(activeRouteSteps)) {
    walkNodes(display.nodes, (node) => {
      if (node.id === routeNodeId && (node.role === 'route')) {
        const segCount = node.children.length;
        const clampedStep = Math.max(0, Math.min(step, segCount));
        for (let i = 0; i < segCount; i++) {
          const seg = node.children[i];
          if (!seg) continue;
          if (i < clampedStep) {
            seg.role = 'route-completed';
          } else if (i === clampedStep && i < segCount) {
            seg.role = 'route-active';
          }
        }
      }
    });
  }

  if (legendEntities.length > 0) {
    const emphasisSet = new Set(legendEntities);
    walkNodes(display.nodes, (node) => {
      if (node.metadata) {
        const entityId = node.metadata.entityId as string | undefined;
        if (entityId && emphasisSet.has(entityId)) {
          node.metadata.emphasis = true;
        }
      }
    });
  }

  applyEncoding(display);

  const encodingAttribute = collectEncodingAttribute(display);
  if (encodingAttribute) {
    injectAutoLegend(display, encodingAttribute);
  }

  if (scaleBarNode) {
    display.nodes.push(scaleBarNode);
  }

  return display;
}

export function emptyMaps(): DisplayMaps {
  return {
    hiddenLayerIds: new Set(),
    shownLayerIds: new Set(),
    activeRouteSteps: {},
    filterCategories: [],
    filterIds: null,
    legendEntities: [],
  };
}

function collectEncodingAttribute(display: Scene): string | undefined {
  let attribute: string | undefined;
  walkNodes(display.nodes, (node) => {
    const attr = node.metadata?.encodingAttribute as string | undefined;
    const bucket = node.metadata?.encodingBucket as string | undefined;
    if (attr && bucket) attribute = attr;
  });
  return attribute;
}

function encodingRangeText(breakpoints: Array<[number, number]>, idx: number): string {
  if (idx < 1 || idx > breakpoints.length) return '';
  const [lo, hi] = breakpoints[idx - 1]!;
  return `[${lo}–${hi})`;
}

function injectAutoLegend(display: Scene, attribute: string): void {
  const legendNode = display.nodes.find((n) => n.id === 'geom-legend');
  if (!legendNode) return;
  const existing = new Set<string>();
  for (const child of legendNode.children) {
    const meta = child.metadata;
    if (meta) {
      const attr = meta.encodingAttribute as string | undefined;
      if (attr) existing.add(attr);
    }
  }
  if (existing.has(attribute)) return;

  const breakpointMap = new Map<string, Array<[number, number]>>();
  walkNodes(display.nodes, (node) => {
    const attr = node.metadata?.encodingAttribute as string | undefined;
    const bps = node.metadata?.encodingBreakpoints as Array<[number, number]> | undefined;
    const bucket = node.metadata?.encodingBucket as string | undefined;
    if (attr === attribute && Array.isArray(bps) && bucket) {
      breakpointMap.set(attr, bps);
    }
  });
  const breakpoints = breakpointMap.get(attribute);
  if (!breakpoints) return;

  const childCount = legendNode.children.length;
  const legendBounds = legendNode.bounds ?? { x: 8, y: 8, width: 120, height: legendNode.children.length * 18 + 10 };
  let width = legendBounds.width;
  for (let i = 0; i < breakpoints.length; i++) {
    const idx = i + 1;
    const item: SceneNode = {
      id: `geom-legend-item-${childCount + i}`,
      role: 'legend-item',
      kind: 'legend-item',
      label: `${attribute}: ${encodingRangeText(breakpoints, idx)}`,
      metadata: { role: 'encoding', encodingBucket: `encoding-bucket-${idx}`, encodingAttribute: attribute },
      children: [],
    };
    width = Math.max(width, (item.label!.length + 2) * 7);
    legendNode.children.push(item);
  }
  const newHeight = legendNode.children.length * 18 + 10;
  legendBounds.width = width + 16;
  legendBounds.height = newHeight;
  const bx = legendBounds.x;
  const by = legendBounds.y;
  for (let i = 0; i < legendNode.children.length; i++) {
    legendNode.children[i]!.bounds = rect(bx + 8, by + 6 + i * 18, legendBounds.width - 16, 16);
  }
}

export function updateMapsFromToggle(maps: DisplayMaps, layerId: string, currentHidden: boolean): { hidden: boolean } {
  if (currentHidden) {
    maps.hiddenLayerIds.delete(layerId);
    maps.shownLayerIds.add(layerId);
  } else {
    maps.hiddenLayerIds.add(layerId);
    maps.shownLayerIds.delete(layerId);
  }
  return { hidden: !currentHidden };
}

export function resolveHiddenLayerIds(maps: DisplayMaps): string[] {
  const resolved = new Set<string>(maps.hiddenLayerIds);
  return Array.from(resolved);
}

export function updateMapsFromStep(maps: DisplayMaps, routeNodeId: string, step?: number): { step: number } {
  const current = maps.activeRouteSteps[routeNodeId] ?? 0;
  const newStep = step !== undefined ? step : current + 1;
  maps.activeRouteSteps[routeNodeId] = newStep;
  return { step: newStep };
}

export function updateMapsFromFilter(maps: DisplayMaps, ids: string[], categories?: string[]): void {
  maps.filterIds = ids;
  if (categories) {
    maps.filterCategories = categories;
  }
}

export function updateMapsFromClearFilter(maps: DisplayMaps): void {
  maps.filterIds = null;
  maps.filterCategories = [];
}

export function updateMapsFromReset(maps: DisplayMaps): void {
  maps.hiddenLayerIds.clear();
  maps.shownLayerIds.clear();
  maps.activeRouteSteps = {};
  maps.filterCategories = [];
  maps.filterIds = null;
  maps.legendEntities = [];
}