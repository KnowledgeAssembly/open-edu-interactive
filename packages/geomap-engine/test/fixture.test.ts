import { describe, it, expect } from 'vitest';
import { GeoMapEngine } from '../src/engine.js';

const ENGINE = new GeoMapEngine();

describe('Fixture validation', () => {
  it('odisha-coastal spec is valid', () => {
    const spec = {
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
            { id: 'india-states', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [{ id: 'odisha', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[82, 18], [84, 18], [84, 20], [82, 20], [82, 18]]] } }, { id: 'west-bengal', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[86, 22], [88, 22], [88, 24], [86, 24], [86, 22]]] } }] } },
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
        legend: { visible: true, items: [{ role: 'primary-region', label: 'State' }, { role: 'marker', label: 'City / Lake' }] },
      },
      interaction: { mode: 'explore', actions: ['select', 'deselect', 'focus', 'reset'] },
      questions: [],
      sources: [{ class: 'authoritative' }],
      accessibility: { label: 'Map of Odisha, its capital Bhubaneswar, and coastal connections.' },
    };
    const result = ENGINE.validate(spec as never);
    if (!result.valid) {
      console.log('ISSUES:', JSON.stringify(result.issues, null, 2));
    }
    expect(result.valid).toBe(true);
  });

  it('region fixture is valid', () => {
    const spec = {
      type: 'geomap',
      version: '1.0.0',
      id: 'region-only',
      metadata: { title: 'Region only' },
      purpose: { learningObjective: 'Identify a region' },
      content: {
        projection: { type: 'equirectangular' },
        geography: {
          sources: [{ id: 'src', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [{ id: 'r1', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }] } }],
        },
        entities: [{ id: 'r1', type: 'region', name: 'Region One', location: { source: 'src', featureId: 'r1' } }],
        layers: [{ id: 'regions', type: 'region', items: [{ entity: 'r1', interactive: true }] }],
      },
      interaction: { mode: 'explore', actions: ['select', 'focus'] },
      questions: [],
      sources: [{ class: 'authoritative' }],
      accessibility: { label: 'Region only map' },
    };
    const result = ENGINE.validate(spec as never);
    if (!result.valid) {
      console.log('REGION ISSUES:', JSON.stringify(result.issues, null, 2));
    }
    expect(result.valid).toBe(true);
  });
});