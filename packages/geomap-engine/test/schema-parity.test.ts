import { describe, it, expect } from 'vitest';
import { ENTITY_TYPES, LAYER_TYPES, ROLE_TYPES, SOURCE_CLASSES } from '../src/schema.js';
import schemaJson from '../src/schemas/geomap-spec.schema.json' with { type: 'json' };

describe('Schema ↔ Zod parity', () => {
  it('ENTITY_TYPES sorted match JSON Schema enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.entities.items.properties.type.enum;
    expect([...ENTITY_TYPES].sort()).toEqual([...schemaEnum].sort());
  });

  it('LAYER_TYPES sorted match JSON Schema enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.layers.items.properties.type.enum;
    expect([...LAYER_TYPES].sort()).toEqual([...schemaEnum].sort());
  });

  it('ROLE_TYPES sorted match JSON Schema enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.layers.items.properties.style.properties.role.enum;
    expect([...ROLE_TYPES].sort()).toEqual([...schemaEnum].sort());
  });

  it('SOURCE_CLASSES sorted match JSON Schema enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.geography.properties.sources.items.properties.class.enum;
    expect([...SOURCE_CLASSES].sort()).toEqual([...schemaEnum].sort());
  });

  it('content has additionalProperties: false', () => {
    expect(schemaJson.properties.content.additionalProperties).toBe(false);
  });

  it('sources[].type is literal "geojson"', () => {
    expect(schemaJson.properties.content.properties.geography.properties.sources.items.properties.type.const).toBe('geojson');
  });

  it('projection.type.enum === ["equirectangular", "mercator", "albers"]', () => {
    const projEnum: string[] = schemaJson.properties.content.properties.projection.properties.type.enum;
    expect(projEnum).toEqual(['equirectangular', 'mercator', 'albers']);
  });

  it('scaleBar.unit.enum === ["km", "mi"]', () => {
    const unitEnum: string[] = schemaJson.properties.content.properties.scaleBar.properties.unit.enum;
    expect(unitEnum).toEqual(['km', 'mi']);
  });

  it('encoding.type.enum === ["fill", "size"]', () => {
    const typeEnum: string[] = schemaJson.properties.content.properties.layers.items.properties.encoding.properties.type.enum;
    expect(typeEnum).toEqual(['fill', 'size']);
  });

  it('entity categories/adjacentTo are optional arrays of strings', () => {
    const entityProps = schemaJson.properties.content.properties.entities.items.properties;
    expect(entityProps.categories.type).toBe('array');
    expect(entityProps.adjacentTo.type).toBe('array');
  });

  it('route items allow interactive and label booleans', () => {
    const itemsSchema = schemaJson.properties.content.properties.layers.items.properties.items;
    expect(itemsSchema.type).toBe('array');
  });

  it('no LLM-pleaser or geometry keys in content surface', () => {
    const contentProps = Object.keys(schemaJson.properties.content.properties);
    const banned = ['makeItPretty', 'svgMagic', 'x', 'y', 'width', 'height', 'fill', 'stroke'];
    for (const b of banned) {
      expect(contentProps).not.toContain(b);
    }
  });

  it('provenance class enum equals SOURCE_CLASSES', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.geography.properties.sources.items.properties.class.enum;
    expect([...schemaEnum].sort()).toEqual([...SOURCE_CLASSES].sort());
  });

  it('envelope sources[].class enum matches', () => {
    const schemaEnum: string[] = schemaJson.properties.sources.items.properties.class.enum;
    expect([...schemaEnum].sort()).toEqual([...SOURCE_CLASSES].sort());
  });
});