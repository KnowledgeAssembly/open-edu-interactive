import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import type { SvgResult, EntityRow } from './types.js';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  let attrs = `id="${escapeXml(node.id)}" data-oedu-role="${escapeXml(node.role)}"`;
  if (node.interactive) {
    attrs += ` data-oedu-interactive="true"`;
  }
  if (node.label) {
    attrs += ` aria-label="${escapeXml(node.label)}"`;
  }
  if (node.description) {
    attrs += ` title="${escapeXml(node.description)}"`;
  }

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 40, height: 24 };
  const { x, y, width, height } = b;
  const cx = x + width / 2;
  const cy = y + height / 2;

  switch (node.kind) {
    case 'region':
      return `${pad}<rect ${attrs} x="${x}" y="${y}" width="${width}" height="${height}" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.5" rx="2"/>`;
    case 'marker':
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${Math.max(4, Math.min(width, height) / 2)}" fill="currentColor" opacity="0.7" stroke="currentColor" stroke-width="1.5"/>`;
    case 'label':
      return `${pad}<text ${attrs} x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="12">${escapeXml(node.label ?? '')}</text>`;
    case 'route-segment':
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="3" fill="currentColor" opacity="0.5"/>`;
    case 'route':
      return `${pad}<g ${attrs}></g>`;
    default:
      return `${pad}<g ${attrs}></g>`;
  }
}

function locationString(node: SceneNode): string {
  const meta = node.metadata;
  if (!meta) return '';
  const lat = meta.lat as number | undefined;
  const lon = meta.lon as number | undefined;
  if (lat !== undefined && lon !== undefined) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
  const source = meta.source as string | undefined;
  const featureId = meta.featureId as string | undefined;
  if (source && featureId) {
    return `${source}#${featureId}`;
  }
  return '';
}

export function svgFrom(scene: Scene, ctx: LayoutContext, label?: string, desc?: string): SvgResult {
  const width = ctx.width;
  const height = ctx.height;

  const childrenSvg = scene.nodes.map((n) => nodeToSvg(n, 1)).join('\n');

  const title = label ?? 'GeoMap';
  const description = desc ?? 'An interactive geographic map';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(description)}</desc>
  <g id="map-root">
    <g id="map-layers">
${childrenSvg}
    </g>
  </g>
</svg>`;

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];
  const alternative: EntityRow[] = [];
  const seenEntityIds = new Set<string>();

  function walk(node: SceneNode): void {
    if (node.interactive && node.acceptsActions) {
      a11y.push({
        id: node.id,
        role: 'button',
        label: node.label ?? node.id,
        children: [],
      });
      for (const action of node.acceptsActions) {
        interactive.push({ id: node.id, action });
      }
    }

    if (node.metadata) {
      const entityId = node.metadata.entityId as string | undefined;
      if (entityId && !seenEntityIds.has(entityId)) {
        seenEntityIds.add(entityId);
        alternative.push({
          entityId,
          type: (node.metadata.entityType as string) ?? '',
          name: (node.metadata.name as string) ?? entityId,
          description: node.metadata.description as string | undefined,
          location: locationString(node),
          sourceClass: node.metadata.sourceClass as string | undefined,
        });
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of scene.nodes) {
    walk(node);
  }

  return { svg, a11y, interactive, alternative };
}