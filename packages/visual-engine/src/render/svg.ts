import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/types.js';
import type { SvgResult } from './types.js';

export type { SvgResult };

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  switch (node.kind) {
    case 'line':
      return `${pad}<line ${attrs} x1="0" y1="0" x2="100" y2="0" stroke="currentColor" stroke-width="2"/>`;
    case 'tick':
      return `${pad}<line ${attrs} x1="0" y1="-6" x2="0" y2="6" stroke="currentColor" stroke-width="1"/>`;
    case 'text':
      return `${pad}<text ${attrs} x="0" y="0" text-anchor="middle" dominant-baseline="central">${escapeXml(node.label ?? String(node.value ?? ''))}</text>`;
    case 'circle':
      return `${pad}<circle ${attrs} cx="0" cy="0" r="8" fill="${node.interactive ? 'currentColor' : 'transparent'}" stroke="currentColor" stroke-width="2"/>`;
    case 'rect':
      return `${pad}<rect ${attrs} x="0" y="0" width="40" height="20" fill="currentColor" opacity="0.2"/>`;
    case 'group':
    default:
      return `${pad}<g ${attrs}></g>`;
  }
}

function sceneNodeToA11y(node: SceneNode, label?: string): { id: string; role: string; label?: string; description?: string; children: unknown[] } {
  return {
    id: node.id,
    role: node.interactive ? 'button' : 'img',
    label: node.label ?? label,
    children: node.children.map((c) => sceneNodeToA11y(c, label)),
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

  // Build a11y tree from scene semantics
  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];

  for (const node of scene.nodes) {
    a11y.push(sceneNodeToA11y(node));
    if (node.interactive && node.acceptsActions) {
      for (const action of node.acceptsActions) {
        interactive.push({ id: node.id, action });
      }
    }
    for (const child of node.children) {
      a11y.push(sceneNodeToA11y(child));
      if (child.interactive && child.acceptsActions) {
        for (const action of child.acceptsActions) {
          interactive.push({ id: child.id, action });
        }
      }
    }
  }

  return { svg, a11y, interactive };
}