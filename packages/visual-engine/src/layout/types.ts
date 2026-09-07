import type { Bounds } from '../scene/types.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

export interface LayoutResult {
  bounds: Bounds[];
  issues: { message: string }[];
}