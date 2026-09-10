# @knowledgeassemble/interactive-react

React bindings for the OpenEdu Interactive Engine. Mount engine instances and composed lessons as React components with SVG click interaction.

## Components

### `InteractiveNode`

Mounts a single engine instance as an SVG surface.

```tsx
import { InteractiveNode } from '@knowledgeassemble/interactive-react';

<InteractiveNode
  spec={mySpec}
  engineType="visual"
  host={myBridge}
  controlsMode="learner"  // default: 'learner'
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spec` | unknown | required | Valid engine spec JSON |
| `engineType` | string | required | `"visual"`, `"chart"`, `"geomap"`, `"timeline"`, `"diagram"` |
| `host` | OpenEduBridge | required | Bridge to host environment |
| `id` | string | spec id | Optional instance id |
| `controlsMode` | `'learner' \| 'dev'` | `'learner'` | `'learner'` = SVG click only; `'dev'` = SVG + labeled button strip |

### `InteractiveLesson`

Mounts a composed lesson (multiple engine instances).

```tsx
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';

<InteractiveLesson
  lesson={composedLesson}
  host={myBridge}
  controlsMode="learner"
/>
```

## SVG click contract

`[data-oedu-interactive="true"]` elements dispatch `select` via delegated click listener. OpenEdu MUST use default `controlsMode="learner"` — the `'dev'` mode is for conformance testing.

## Subpath exports

- `@knowledgeassemble/interactive-react/svg-surface` — raw SVG interaction utilities (`bindSvgInteraction`, `syncSvgSurface`, `applySelectionState`)