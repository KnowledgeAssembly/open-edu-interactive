import { describe, it, expect } from 'vitest';
import { GeoMapContentSchema } from '../src/schema.js';

describe('GeoMapContentSchema', () => {
  it('accepts new projection types (mercator, albers)', () => {
    for (const type of ['mercator', 'albers'] as const) {
      const result = GeoMapContentSchema.safeParse({
        projection: { type },
        geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
        entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
        layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown projection type', () => {
    const result = GeoMapContentSchema.safeParse({
      projection: { type: 'orthographic' },
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts scaleBar with unit km/mi', () => {
    const result = GeoMapContentSchema.safeParse({
      scaleBar: { visible: true, unit: 'km' },
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts entity with categories and adjacentTo', () => {
    const result = GeoMapContentSchema.safeParse({
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } }, categories: ['capital'], adjacentTo: ['other'] }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts item with measure', () => {
    const result = GeoMapContentSchema.safeParse({
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt', measure: { attribute: 'area', value: 500 } }] }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts layer with encoding', () => {
    const result = GeoMapContentSchema.safeParse({
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt', measure: { attribute: 'size', value: 100 } }], encoding: { attribute: 'size', type: 'fill', breakpoints: [[0, 50], [51, 100]] } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts route item with interactive and label', () => {
    const result = GeoMapContentSchema.safeParse({
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [
        { id: 'a', type: 'city', name: 'A', location: { coordinates: { lat: 20, lon: 80 } } },
        { id: 'b', type: 'city', name: 'B', location: { coordinates: { lat: 21, lon: 81 } } },
      ],
      layers: [{ id: 'r', type: 'route', items: [{ id: 'r1', path: ['a', 'b'], interactive: true, label: true }] }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts legend items with linkedEntities and interactive', () => {
    const result = GeoMapContentSchema.safeParse({
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
      legend: { items: [{ role: 'marker', label: 'Capital', linkedEntities: ['pt'], interactive: true }] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown content keys (strict schema)', () => {
    const result = GeoMapContentSchema.safeParse({
      timeline: [],
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 20, lon: 80 } } }],
      layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
    });
    expect(result.success).toBe(false);
  });
});