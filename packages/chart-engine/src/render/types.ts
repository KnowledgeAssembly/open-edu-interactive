export interface SvgResult {
  svg: string;
  a11y: Array<{ id: string; role: string; label: string; children: unknown[] }>;
  interactive: Array<{ id: string; action: string }>;
  tabular: TabularRow[];
}

export interface TabularRow {
  rowLabel: string;
  values: Array<{ measureId: string; value: number | null; unit?: string }>;
}

export interface A11yNode {
  id: string;
  role: string;
  label: string;
  children: A11yNode[];
}