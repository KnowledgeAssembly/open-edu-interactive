import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..', '..', '..');
const PKG_DIR = resolve(ROOT, 'packages', 'engine-skills');
const SKILLS_DIR = resolve(PKG_DIR, 'skills');

const ENGINES = [
  {
    type: 'visual',
    skill: 'educational-visual',
    skillDocSrc: resolve(ROOT, 'docs/engines/visual/skills/educational-visual/SKILL.md'),
    schemaSrc: resolve(ROOT, 'packages/visual-engine/src/schemas/visual-spec.schema.json'),
    exampleSrc: resolve(ROOT, 'docs/fixtures/visual/skill-example.json'),
    envelopeSchemaSrc: resolve(ROOT, 'packages/interactive-engine/src/schemas/interactive-engine.schema.json'),
    kindEnumPath: ['properties', 'kind', 'enum'],
    validationContract: { package: '@knowledgeassemble/visual-engine', symbol: 'VisualEngine', method: 'validate' },
    namespacedEvents: ['visual.*-selected', 'visual.*-focused'],
  },
  {
    type: 'chart',
    skill: 'quantitative-chart',
    skillDocSrc: resolve(ROOT, 'docs/engines/chart/skills/quantitative-chart/SKILL.md'),
    schemaSrc: resolve(ROOT, 'packages/chart-engine/src/schemas/chart-spec.schema.json'),
    exampleSrc: resolve(ROOT, 'docs/fixtures/chart/skill-example.json'),
    kindEnumPath: ['properties', 'content', 'properties', 'kind', 'enum'],
    isFullSchema: true,
    validationContract: { package: '@knowledgeassemble/chart-engine', symbol: 'ChartEngine', method: 'validate' },
    namespacedEvents: ['chart.*-selected', 'chart.*-focused'],
  },
  {
    type: 'geomap',
    skill: 'geographic-map',
    skillDocSrc: resolve(ROOT, 'docs/engines/geomap/skills/geographic-map/SKILL.md'),
    schemaSrc: resolve(ROOT, 'packages/geomap-engine/src/schemas/geomap-spec.schema.json'),
    exampleSrc: resolve(ROOT, 'docs/fixtures/geomap/skill-example.json'),
    isFullSchema: true,
    validationContract: { package: '@knowledgeassemble/geomap-engine', symbol: 'GeoMapEngine', method: 'validate' },
    namespacedEvents: ['geomap.*-selected', 'geomap.*-focused'],
  },
  {
    type: 'timeline',
    skill: 'temporal-timeline',
    skillDocSrc: resolve(ROOT, 'docs/engines/timeline/skills/temporal-timeline/SKILL.md'),
    schemaSrc: resolve(ROOT, 'packages/timeline-engine/src/schemas/timeline-spec.schema.json'),
    exampleSrc: resolve(ROOT, 'docs/fixtures/timeline/skill-example.json'),
    kindEnumPath: ['properties', 'content', 'properties', 'kind', 'enum'],
    isFullSchema: true,
    validationContract: { package: '@knowledgeassemble/timeline-engine', symbol: 'TimelineEngine', method: 'validate' },
    namespacedEvents: ['timeline.*-selected', 'timeline.*-focused'],
  },
  {
    type: 'diagram',
    skill: 'structural-diagram',
    skillDocSrc: resolve(ROOT, 'docs/engines/diagram/skills/structural-diagram/SKILL.md'),
    schemaSrc: resolve(ROOT, 'packages/diagram-engine/src/schemas/diagram-spec.schema.json'),
    exampleSrc: resolve(ROOT, 'docs/fixtures/diagram/skill-example.json'),
    kindEnumPath: ['properties', 'content', 'properties', 'kind', 'enum'],
    isFullSchema: true,
    validationContract: { package: '@knowledgeassemble/diagram-engine', symbol: 'DiagramEngine', method: 'validate' },
    namespacedEvents: ['diagram.*-selected', 'diagram.*-focused'],
  },
  {
    type: 'composition',
    skill: 'composition',
    skillDocSrc: resolve(ROOT, 'docs/engines/composition/skills/composition/SKILL.md'),
    schemaSrc: resolve(ROOT, 'docs/schemas/composition.schema.json'),
    exampleSrc: resolve(ROOT, 'docs/fixtures/composition/skill-example.json'),
    isFullSchema: true,
    validationContract: { package: '@knowledgeassemble/engine-skills', symbol: 'validateSpec', method: 'composition' },
    namespacedEvents: [],
  },
];

function deepGet(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function rewriteSkillDoc(doc) {
  const pathReplacements = [
    [/packages\/chart-engine\/src\/schemas\/chart-spec\.schema\.json/g, './schema.json'],
    [/packages\/diagram-engine\/src\/schemas\/diagram-spec\.schema\.json/g, './schema.json'],
    [/packages\/geomap-engine\/src\/schemas\/geomap-spec\.schema\.json/g, './schema.json'],
    [/packages\/timeline-engine\/src\/schemas\/timeline-spec\.schema\.json/g, './schema.json'],
    [/packages\/visual-engine\/src\/schemas\/visual-spec\.schema\.json/g, './schema.json'],
    [/packages\/interactive-engine\/src\/schemas\/interactive-engine\.schema\.json/g, './schema.json'],
    [/docs\/schemas\/composition\.schema\.json/g, './schema.json'],
    [/docs\/schemas\/interactive-engine\.schema\.json/g, './schema.json'],
    [/docs\/fixtures\/([\w-]+)\/skill-example\.json/g, './skill-example.json'],
  ];
  let result = doc;
  for (const [pattern, replacement] of pathReplacements) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(
    /(?:ChartEngine|VisualEngine|DiagramEngine|GeoMapEngine|TimelineEngine)\.validate\(spec\)/g,
    'runtime validation is via the manifest `validationContract` (install package, import symbol, call method(spec))',
  );
  result = result.replace(
    /pnpm --filter @knowledgeassemble\/[\w-]+-engine exec tsx -e "[^"]*"/g,
    'runtime validation is via the manifest `validationContract` (install package, import symbol, call method(spec))',
  );

  const lines = result.split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- **') && trimmed.includes('`docs/')) return false;
    return true;
  });
  result = filtered.join('\n');

  result = result.replace(/\n{3,}/g, '\n\n');

  result = result.replace(/## [^\n]+\n(?=\n*## )/g, '');

  return result.trim() + '\n';
}

function checkNoInRepoPaths(doc, engineType) {
  const lines = doc.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('packages/') || lines[i].includes('docs/')) {
      const refMatch = lines[i].match(/(packages\/[^\s]+|docs\/[^\s]+)/);
      throw new Error(`[generate-skills] Engine "${engineType}" generated SKILL.md still contains in-repo path "${refMatch ? refMatch[0] : 'unknown'}" at line ${i + 1}: ${lines[i].trim()}`);
    }
  }
}

function composeVisualSchema(envelopeSchema, contentSchema) {
  const envelope = typeof envelopeSchema === 'object' && envelopeSchema !== null
    ? JSON.parse(JSON.stringify(envelopeSchema))
    : envelopeSchema;
  const visualContent = typeof contentSchema === 'object' && contentSchema !== null
    ? JSON.parse(JSON.stringify(contentSchema))
    : contentSchema;

  envelope.properties.type = { const: 'visual' };
  envelope.properties.content = visualContent;
  if (!envelope.required) {
    envelope.required = ['type', 'version', 'id'];
  }
  if (!envelope.required.includes('content')) {
    envelope.required.push('content');
  }
  envelope.additionalProperties = false;

  relaxProps(envelope.properties.content);

  return envelope;
}

function relaxProps(schema) {
  if (schema == null || typeof schema !== 'object') return;
  if (Array.isArray(schema)) {
    for (const item of schema) relaxProps(item);
    return;
  }
  if (
    schema.type === 'object' &&
    schema.additionalProperties === false &&
    !schema.oneOf &&
    !schema.anyOf &&
    !schema.$ref
  ) {
    const definedProps = schema.properties;
    if (!definedProps || typeof definedProps !== 'object' || Object.keys(definedProps).length === 0) {
      schema.additionalProperties = true;
    }
  }
  for (const value of Object.values(schema)) {
    relaxProps(value);
  }
}

function getKinds(engine) {
  if (!engine.kindEnumPath) {
    return [];
  }
  try {
    const schema = readJson(engine.schemaSrc);
    const kinds = deepGet(schema, engine.kindEnumPath);
    if (Array.isArray(kinds)) {
      return kinds;
    }
  } catch {
    // ignore
  }
  return [];
}

const packageJson = readJson(resolve(PKG_DIR, 'package.json'));

const manifestEngines = [];

for (const engine of ENGINES) {
  const engDir = resolve(SKILLS_DIR, engine.type);
  mkdirSync(engDir, { recursive: true });

  // SKILL.md rewrite
  let skillDoc = readFileSync(engine.skillDocSrc, 'utf8');
  skillDoc = rewriteSkillDoc(skillDoc);
  checkNoInRepoPaths(skillDoc, engine.type);
  writeFileSync(resolve(engDir, 'SKILL.md'), skillDoc);

  // schema.json
  if (engine.type === 'visual') {
    const envelopeSchema = readJson(engine.envelopeSchemaSrc);
    const contentSchema = readJson(engine.schemaSrc);
    const composed = composeVisualSchema(envelopeSchema, contentSchema);
    writeJson(resolve(engDir, 'schema.json'), composed);
  } else if (engine.isFullSchema) {
    const schema = readJson(engine.schemaSrc);
    writeJson(resolve(engDir, 'schema.json'), schema);
  }

  // skill-example.json
  const example = readJson(engine.exampleSrc);
  writeJson(resolve(engDir, 'skill-example.json'), example);

  // kinds
  const kinds = getKinds(engine);

  manifestEngines.push({
    type: engine.type,
    skill: engine.skill,
    kinds,
    skillDoc: `./skills/${engine.type}/SKILL.md`,
    schema: `./skills/${engine.type}/schema.json`,
    example: `./skills/${engine.type}/skill-example.json`,
    validationContract: engine.validationContract,
    namespacedEvents: engine.namespacedEvents,
  });
}

const manifest = {
  package: packageJson.name,
  version: packageJson.version,
  schemaVersion: 1,
  engines: manifestEngines,
};

writeJson(resolve(PKG_DIR, 'manifest.json'), manifest);

console.log(`[generate-skills] manifest + skills generated for ${ENGINES.length} engines`);