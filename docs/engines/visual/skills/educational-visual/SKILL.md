# Educational Visual Engine — AI Authoring Skill

## When to use

Use the Visual Engine when you need to create an interactive educational visualization. The Visual Engine supports these kinds (set `content.kind`):

| Kind | Purpose |
|------|---------|
| `number-line` | Teach number sense, estimation, fractions on a line |
| `counting-set` | Teach counting, cardinality, one-to-one correspondence |
| `fraction` | Teach fractions using a rectangular bar model |
| `fraction-comparison` | Compare two fractions using circle models |
| `clock` | Teach telling time |
| `coordinate-grid` | Teach coordinate systems, plotting points |
| `geometry` | Teach shape recognition, sides, vertices |
| `comparison` | Compare two values (greater-than, less-than, equal) |

## Spec structure

Use the shared Interactive Engine envelope (`type: "visual"`, `version`, `id`). All visual content lives under `content`:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "purpose": {
    "learningObjective": "...",
    "interactionGoal": "...",
    "reasoningMode": "identify | compare | estimate | explore"
  },
  "content": {
    "kind": "number-line",
    "components": [
      {
        "id": "nl",
        "type": "number-line",
        "props": {
          "min": 0,
          "max": 10,
          "step": 1,
          "highlight": [7]
        }
      }
    ]
  },
  "accessibility": {
    "label": "Short accessible name",
    "description": "Full description for screen readers"
  },
  "interaction": {
    "mode": "explore | identify | construct",
    "actions": ["select", "focus", "reset"]
  }
}
```

## Rules

- **Semantic-first:** describe *what*, not pixels. No `x`, `y`, `width`, `height` in spec.
- **D5 actions only:** use `select`, `focus`, `reset`, etc. No `click`, `highlight`, `show`.
- **Accessibility required:** always include `accessibility.label` and `accessibility.description`.
- **Valid component id pattern:** `^[a-zA-Z][a-zA-Z0-9._-]*$`, max 128 chars.
- **No raw colors:** use semantic tokens (`accent.primary`, `surface.primary`, etc.).

## Number-line props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `min` | number | yes | Start of range |
| `max` | number | yes | End of range (must be > min) |
| `step` | number | yes | Interval between ticks (> 0) |
| `majorStep` | number | no | Interval for major ticks |
| `showLabels` | boolean | no | Show tick labels (default true) |
| `highlight` | number[] | no | Values to show as interactive markers |
| `rangeHighlight` | [number,number][] | no | Ranges to highlight |

## Validation

Always validate your spec before use. Use the VisualEngine's `validate()` method or run through the full pipeline. Common errors:

- `INVALID_ENTITY` — unknown kind, invalid props (e.g. max <= min)
- `INVALID_REFERENCE` — relationship refers to nonexistent id
- `INVALID_ACTION` — action not in D5 set
- `ACCESSIBILITY_ERROR` — missing labels or color-only meaning

## Example round-trip

This spec should pass validation:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "example-nl",
  "content": {
    "kind": "number-line",
    "components": [
      {
        "id": "nl",
        "type": "number-line",
        "props": { "min": 0, "max": 10, "step": 1, "highlight": [5] }
      }
    ]
  },
  "accessibility": {
    "label": "Number line from 0 to 10",
    "description": "The number 5 is highlighted"
  }
}
```

## Design constraints

- Do NOT include `timeline`, `flowchart`, or `label-diagram` as Visual kinds. Those belong to the Timeline and Diagram engines.
- Do NOT add inline scripts, `on*` event handlers, or `javascript:` URIs.
- Do NOT use wall-clock or random values for layout or IDs.
- Do NOT import `@open-edu/*` or other engine packages from visual-engine code.