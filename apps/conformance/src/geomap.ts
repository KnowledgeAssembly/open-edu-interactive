import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import { GeoMapEngine } from '@knowledgeassemble/geomap-engine';
import type { EngineAction } from '@knowledgeassemble/interactive-engine';

const ODISHA_SPEC = {
  type: 'geomap',
  version: '1.0.0',
  id: 'odisha-coastal',
  metadata: { title: 'Odisha and its coastal neighbours' },
  purpose: { learningObjective: 'Locate Odisha, its capital, and its coastal connections', reasoningMode: 'explore' },
  content: {
    viewport: { fit: 'content', padding: 0.08 },
    projection: { type: 'equirectangular' },
    geography: {
      sources: [
        {
          id: 'india-states',
          type: 'geojson',
          class: 'authoritative',
          data: {
            type: 'FeatureCollection',
            features: [
              { id: 'odisha', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[82, 18], [84, 18], [84, 20], [82, 20], [82, 18]]] } },
              { id: 'west-bengal', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[86, 22], [88, 22], [88, 24], [86, 24], [86, 22]]] } },
            ],
          },
        },
      ],
    },
    entities: [
      { id: 'odisha', type: 'state', name: 'Odisha', description: 'A state on the eastern coast of India.', location: { source: 'india-states', featureId: 'odisha' } },
      { id: 'west-bengal', type: 'state', name: 'West Bengal', description: 'A state in eastern India.', location: { source: 'india-states', featureId: 'west-bengal' } },
      { id: 'bhubaneswar', type: 'city', name: 'Bhubaneswar', description: 'Capital of Odisha.', location: { coordinates: { lat: 20.2961, lon: 85.8245 } } },
      { id: 'chilika', type: 'lake', name: 'Chilika Lake', description: 'A brackish water lagoon.', location: { coordinates: { lat: 19.7, lon: 85.3 } } },
    ],
    layers: [
      { id: 'states', type: 'region', items: [{ entity: 'odisha', interactive: true }, { entity: 'west-bengal', interactive: true }] },
      { id: 'cities', type: 'marker', items: [{ entity: 'bhubaneswar', label: true, interactive: true }] },
      { id: 'water', type: 'marker', items: [{ entity: 'chilika', label: true, interactive: true }] },
    ],
    legend: { visible: true, items: [
      { role: 'primary-region', label: 'State' },
      { role: 'marker', label: 'City / Lake' },
    ] },
  },
  interaction: { mode: 'explore', actions: ['select', 'deselect', 'focus', 'reset'] },
  questions: [],
  sources: [{ class: 'authoritative' }],
  accessibility: { label: 'Map of Odisha, its capital Bhubaneswar, and coastal connections.' },
};

interface EntityRow {
  entityId: string;
  type: string;
  name: string;
  description?: string;
  location: string;
  sourceClass?: string;
}

interface GeoMapHarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  svg(): string;
  alternative(): EntityRow[];
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
}

declare global {
  interface Window {
    __geomapHarness?: GeoMapHarnessRemote;
  }
}

interface SnapshotShape {
  svgResult?: { svg: string; alternative: EntityRow[] };
}

export function mountGeomap(app: HTMLElement): void {
  const registry = new EngineRegistry();
  registry.register(new GeoMapEngine());

  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: (msg: string) => console.log('[announce]', msg),
    onEvent: (event: { seq: number; name: string; action?: unknown }) => {
      if (emitted.length < 200) {
        emitted.push({ seq: event.seq, name: event.name, action: event.action });
      }
    },
    resolveAsset: (id: string) => id,
  };

  const engine = new GeoMapEngine();
  const instance = engine.instantiate(ODISHA_SPEC as never, host, 'odisha-coastal');

  const svgContainer = document.createElement('div');
  svgContainer.setAttribute('data-oedu-root', 'geomap');
  app.appendChild(svgContainer);

  const alternativeList = document.createElement('ul');
  alternativeList.setAttribute('aria-label', 'Geographic entities list');
  app.appendChild(alternativeList);

  let latest: SnapshotShape = {};

  function renderDom(): void {
    const snap = instance.snapshot() as SnapshotShape;
    latest = snap;
    svgContainer.innerHTML = snap.svgResult?.svg ?? '';
    const entities = snap.svgResult?.alternative ?? [];

    alternativeList.innerHTML = '';
    for (const ent of entities) {
      const li = document.createElement('li');
      li.textContent = `${ent.name} (${ent.type})${ent.description ? ': ' + ent.description : ''} — ${ent.location}`;
      alternativeList.appendChild(li);
    }
  }

  renderDom();

  window.__geomapHarness = {
    dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void {
      instance.dispatch(action as EngineAction);
      renderDom();
    },
    snapshot(): unknown {
      return instance.snapshot();
    },
    events() {
      return [...emitted];
    },
    svg(): string {
      return latest.svgResult?.svg ?? '';
    },
    alternative(): EntityRow[] {
      return latest.svgResult?.alternative ?? [];
    },
    tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
      try {
        const r = new GeoMapEngine().validate(spec as never);
        return { ok: r.valid, message: r.issues.map((i) => i.message).join('; ') };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
}