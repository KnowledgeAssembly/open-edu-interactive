import {
  geoEquirectangular,
  geoMercator,
  geoAlbers,
  type GeoProjection,
} from 'd3-geo';
import type { Point } from './geometry.js';

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface Projector {
  (lon: number, lat: number): Point;
  invert: (x: number, y: number) => { lon: number; lat: number };
  scale: number;
  center: [number, number];
  translate: [number, number];
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ProjectorOptions {
  center?: { lat: number; lon: number };
  scale?: number;
}

export type ProjectionType = 'equirectangular' | 'mercator' | 'albers';

function makeD3Projector(type: ProjectionType): GeoProjection {
  switch (type) {
    case 'mercator':
      return geoMercator();
    case 'albers':
      return geoAlbers();
    case 'equirectangular':
    default:
      return geoEquirectangular();
  }
}

export function makeProjector(
  type: ProjectionType,
  width: number,
  height: number,
  options?: ProjectorOptions,
): Projector {
  const center = options?.center ?? { lat: 0, lon: 0 };
  const baseScale = options?.scale ?? Math.min(width, height) / (2 * Math.PI);
  const scale = baseScale;
  const cx = width / 2;
  const cy = height / 2;

  const d3Proj = makeD3Projector(type);
  d3Proj.center([center.lon, center.lat]);
  d3Proj.scale(scale);
  d3Proj.translate([cx, cy]);

  const project = function (lon: number, lat: number): Point {
    const p = d3Proj([lon, lat]);
    if (!p) return { x: 0, y: 0 };
    return { x: p[0], y: p[1] };
  };

  project.invert = function (x: number, y: number): { lon: number; lat: number } {
    const p = d3Proj.invert!([x, y]);
    if (!p) return { lon: 0, lat: 0 };
    return { lon: p[0], lat: p[1] };
  };

  project.scale = scale;
  project.center = [center.lon, center.lat] as [number, number];
  project.translate = [cx, cy] as [number, number];

  return project;
}

export function bboxOf(lons: number[], lats: number[]): BBox {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  for (const lon of lons) {
    if (lon < west) west = lon;
    if (lon > east) east = lon;
  }
  for (const lat of lats) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }

  return { west, south, east, north };
}

export function fitViewport(
  bbox: BBox,
  canvas: { width: number; height: number },
  padding: number = 0.08,
): { scale: number; cx: number; cy: number } {
  const { west, south, east, north } = bbox;
  const lonRadSpan = toRadians(east - west) || 1;
  const latRadSpan = toRadians(north - south) || 1;

  const padW = canvas.width * padding;
  const padH = canvas.height * padding;
  const availW = canvas.width - 2 * padW;
  const availH = canvas.height - 2 * padH;

  const scaleX = availW / lonRadSpan;
  const scaleY = availH / latRadSpan;
  const scale = Math.min(scaleX, scaleY);

  const cx = (west + east) / 2;
  const cy = (south + north) / 2;

  return { scale, cx, cy };
}