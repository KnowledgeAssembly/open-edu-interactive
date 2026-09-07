import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/types.js';
import type { SvgResult } from './types.js';

export type { SvgResult };

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function centerOf(bounds: { x: number; y: number; width: number; height: number }): { cx: number; cy: number } {
  return { cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2 };
}

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  let attrs = `id="${escapeXml(node.id)}" data-oedu-role="${escapeXml(node.role)}"`;
  if (node.value !== undefined) {
    attrs += ` data-oedu-value="${node.value}"`;
  }
  if (node.interactive) {
    attrs += ` data-oedu-interactive="true"`;
  }
  if (node.label) {
    attrs += ` aria-label="${escapeXml(node.label)}"`;
  }
  if (node.bounds) {
    attrs += ` data-oedu-bounds="${node.bounds.x},${node.bounds.y},${node.bounds.width},${node.bounds.height}"`;
  }

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 40, height: 24 };
  const { cx, cy } = centerOf(b);

  switch (node.kind) {
    case 'line':
      return `${pad}<line ${attrs} x1="${b.x}" y1="${cy}" x2="${b.x + b.width}" y2="${cy}" stroke="currentColor" stroke-width="2"/>`;
    case 'tick':
      return `${pad}<line ${attrs} x1="${cx}" y1="${b.y}" x2="${cx}" y2="${b.y + b.height}" stroke="currentColor" stroke-width="1"/>`;
    case 'text':
      return `${pad}<text ${attrs} x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central">${escapeXml(node.label ?? String(node.value ?? ''))}</text>`;
    case 'circle':
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${Math.max(4, Math.min(b.width, b.height) / 2)}" fill="${node.interactive ? 'currentColor' : 'transparent'}" stroke="currentColor" stroke-width="2"/>`;
    case 'rect':
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="currentColor" opacity="0.2"/>`;
    case 'group':
    default:
      return `${pad}<g ${attrs}></g>`;
  }
}

function sceneNodeToA11y(node: SceneNode): SvgResult['a11y'][number] {
  return {
    id: node.id,
    role: node.interactive ? 'button' : node.children.length > 0 ? 'group' : 'img',
    label: node.label ?? node.id,
    children: node.children.map((c) => sceneNodeToA11y(c)),
  };
}

export function svgFrom(scene: Scene, ctx: LayoutContext): SvgResult {
  const width = ctx.width;
  const height = ctx.height;

  const childrenSvg = scene.nodes.map((n) => nodeToSvg(n, 1)).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <title>Interactive number line</title>
  <desc>An interactive educational number line visualization</desc>
  <g id="visual-root">
${childrenSvg}
  </g>
</svg>`;

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];

  function collect(nodes: SceneNode[]): void {
    for (const node of nodes) {
      a11y.push(sceneNodeToA11y(node));
      if (node.interactive && node.acceptsActions) {
        for (const action of node.acceptsActions) {
          interactive.push({ id: node.id, action });
        }
      }
      collect(node.children);
    }
  }
  collect(scene.nodes);

  return { svg, a11y, interactive };
}
