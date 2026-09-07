# Bar fixture: rainfall-monthly

A valid bar chart with 4 monthly rainfall data points (Feb, May, Aug, Nov).

- **kind:** `bar`
- **dimensions:** 1 ordinal (`month`)
- **measures:** 1 quantitative (`rainfall`, unit `mm`)
- **data:** 4 rows with distinct ordinal categories
- **interaction:** explore mode with select, focus, filter, reset
- **sources:** authoritative

This fixture covers the baseline bar chart case. It should pass all four validation layers (L1–L4) and render 4 bars with ordinal labels on the x-axis and quantitative scale on the y-axis.