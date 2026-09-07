# Line fixture: temperature-quarterly

A valid line chart with 4 quarterly temperature data points (Jan, Apr, Jul, Oct).

- **kind:** `line`
- **dimensions:** 1 ordinal (`month`)
- **measures:** 1 quantitative (`temp`, unit `°C`)
- **data:** 4 rows (minimum 2 required for line charts)
- **interaction:** explore mode with select, focus, reset
- **sources:** authoritative

This fixture covers the baseline line chart case with enough points to show a trend. It should pass all four validation layers (L1–L4) and render a line with 4 markers connected by a path.