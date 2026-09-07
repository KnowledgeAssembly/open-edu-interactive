export interface SvgResult {
  svg: string;
  a11y: Array<{ id: string; role: string; label?: string; description?: string; children: unknown[] }>;
  interactive: Array<{ id: string; action: string }>;
}