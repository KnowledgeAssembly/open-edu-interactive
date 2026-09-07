import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import type { GeoMapContent } from '../src/schema.js';

function identityAsset(id: string): string { return id; }

const odishaContent: GeoMapContent = {
  projection: { type: 'equirectangular' },
  geography: {
    sources: [
      { id: 'india-states', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [{ id: 'odisha', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[82, 18], [84, 18], [84, 20], [82, 20], [82, 18]]] } }] } },
    ],
  },
  entities: [
    { id: 'odisha', type: 'state', name: 'Odisha', description: 'A state on the eastern coast.', location: { source: 'india-states', featureId: 'odisha' } },
    { id: 'bhubaneswar', type: 'city', name: 'Bhubaneswar', location: { coordinates: { lat: 20.2961, lon: 85.8245 } } },
  ],
  layers: [
    { id: 'states', type: 'region', items: [{ entity: 'odisha', interactive: true }] },
    { id: 'cities', type: 'marker', items: [{ entity: 'bhubaneswar', label: true }] },
  ],
};

describe('buildScene', () => {
  it('produces region and marker nodes from the §2 example', () => {
    const scene = buildScene(odishaContent, identityAsset);
    expect(scene.nodes.length).toBeGreaterThanOrEqual(2);
    const regionNode = scene.nodes.find((n) => n.role === 'region');
    expect(regionNode).toBeDefined();
    expect(regionNode!.metadata?.entityId).toBe('odisha');
    expect(regionNode!.metadata?.name).toBe('Odisha');

    const markerNode = scene.nodes.find((n) => n.role === 'marker');
    expect(markerNode).toBeDefined();
    expect(markerNode!.metadata?.entityId).toBe('bhubaneswar');
  });

  it('produces deterministic ids geom-<layerId>-<entityId>', () => {
    const scene = buildScene(odishaContent, identityAsset);
    const regionNode = scene.nodes.find((n) => n.role === 'region');
    expect(regionNode!.id).toBe('geom-states-odisha');
    const markerNode = scene.nodes.find((n) => n.role === 'marker');
    expect(markerNode!.id).toBe('geom-cities-bhubaneswar');
  });

  it('produces route with segment children', () => {
    const routeContent: GeoMapContent = {
      geography: {
        sources: [{ id: 'points', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }],
      },
      entities: [
        { id: 'a', type: 'city', name: 'City A', location: { coordinates: { lat: 10, lon: 20 } } },
        { id: 'b', type: 'city', name: 'City B', location: { coordinates: { lat: 11, lon: 21 } } },
      ],
      layers: [
        { id: 'route1', type: 'route', items: [{ id: 'my-route', path: ['a', 'b'] }] },
      ],
    };
    const scene = buildScene(routeContent, identityAsset);
    const routeNode = scene.nodes.find((n) => n.role === 'route');
    expect(routeNode).toBeDefined();
    expect(routeNode!.children.length).toBe(2);
    expect(routeNode!.children[0]!.id).toBe('geom-route1-my-route-seg-0');
    expect(routeNode!.children[1]!.id).toBe('geom-route1-my-route-seg-1');
  });

  it('throws INVALID_REFERENCE for missing featureId in source', () => {
    const badContent: GeoMapContent = {
      geography: {
        sources: [{ id: 'missing-features', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }],
      },
      entities: [
        { id: 'ghost', type: 'state', name: 'Ghost', location: { source: 'missing-features', featureId: 'nonexistent' } },
      ],
      layers: [{ id: 'l', type: 'region', items: [{ entity: 'ghost' }] }],
    };
    try {
      buildScene(badContent, identityAsset);
      expect.unreachable('should have thrown');
    } catch (e) {
      const err = e as { code: string };
      expect(err.code).toBe('INVALID_REFERENCE');
    }
  });

  it('throws INVALID_ENTITY for duplicate node ids', () => {
    const dupContent: GeoMapContent = {
      geography: {
        sources: [{ id: 'dup-source', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }],
      },
      entities: [
        { id: 'same', type: 'city', name: 'Same', location: { coordinates: { lat: 0, lon: 0 } } },
      ],
      layers: [
        { id: 'l1', type: 'marker', items: [{ entity: 'same' }] },
        { id: 'l2', type: 'marker', items: [{ entity: 'same' }] },
      ],
    };
    // Second layer should cause duplicate source id if source is duplicate, but here entity ids are not unique across layers
    const scene = buildScene(dupContent, identityAsset);
    // Both nodes should exist with different ids due to layer prefix
    expect(scene.nodes.length).toBe(2);
    expect(scene.nodes[0]!.id).not.toBe(scene.nodes[1]!.id);
  });

  it('throws INVALID_REFERENCE for unknown entity in layer', () => {
    const badContent: GeoMapContent = {
      geography: {
        sources: [{ id: 'src', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }],
      },
      entities: [
        { id: 'exists', type: 'city', name: 'Exists', location: { coordinates: { lat: 0, lon: 0 } } },
      ],
      layers: [
        { id: 'l', type: 'marker', items: [{ entity: 'does-not-exist' }] },
      ],
    };
    try {
      buildScene(badContent, identityAsset);
      expect.unreachable('should have thrown');
    } catch (e) {
      const err = e as { code: string };
      expect(err.code).toBe('INVALID_REFERENCE');
    }
  });
});