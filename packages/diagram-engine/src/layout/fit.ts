import { MEDIA_BOX, MEDIA_LABEL_GAP } from '@knowledgeassemble/svg-kit';

/**
 * Smallest media figure worth rendering. Below this a figure stops being
 * legible, so layouts clamp here and let validation report any residual
 * overflow rather than shrinking a figure into nothing.
 */
export const MEDIA_MIN_BOX = { width: 120, height: 65 } as const;

/** Lower bound for the uniform media scale; the aspect ratio is preserved. */
export const MEDIA_MIN_SCALE = Math.max(
  MEDIA_MIN_BOX.width / MEDIA_BOX.width,
  MEDIA_MIN_BOX.height / MEDIA_BOX.height,
);

export const NODE_GAP = 20;
export const CANVAS_PADDING = 40;

/** Vertical room reserved beneath a media box for its label. */
export const LABEL_ALLOWANCE = MEDIA_LABEL_GAP + 20;

/** Continuous media size for a scale in (0, 1]; unrounded, for solvers. */
export function mediaSizeAt(scale: number): { width: number; height: number } {
  return { width: MEDIA_BOX.width * scale, height: MEDIA_BOX.height * scale };
}

/**
 * Largest integer media box that fits within the given allowance, clamped to
 * the legibility floor. Each dimension is clamped independently so a scale of 1
 * reproduces MEDIA_BOX exactly and the floor never depends on rounding.
 */
export function fitMediaBox(maxWidth: number, maxHeight: number): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / MEDIA_BOX.width, maxHeight / MEDIA_BOX.height);
  return {
    width: clampInt(MEDIA_BOX.width * scale, MEDIA_MIN_BOX.width, MEDIA_BOX.width),
    height: clampInt(MEDIA_BOX.height * scale, MEDIA_MIN_BOX.height, MEDIA_BOX.height),
  };
}

/** Every integer media width from MEDIA_BOX down to the floor, paired with its aspect height. */
export function mediaBoxCandidates(): Array<{ width: number; height: number }> {
  const out: Array<{ width: number; height: number }> = [];
  for (let w = MEDIA_BOX.width; w >= MEDIA_MIN_BOX.width; w--) {
    const h = clampInt(Math.round((w * MEDIA_BOX.height) / MEDIA_BOX.width), MEDIA_MIN_BOX.height, MEDIA_BOX.height);
    out.push({ width: w, height: h });
  }
  return out;
}

/**
 * Square media slots for ring layouts.
 *
 * On a ring every centre-to-centre chord is equal, so arrow length is decided
 * entirely by how much chord each box absorbs. That inset depends on the chord
 * direction against the box's aspect: a horizontal chord gives up `width` while
 * a vertical one gives up `height`. Measured on a 5-node ring at 800x600, the
 * 220x120 media aspect yields arrows of 171/81/132/81/171 (a 2.12 ratio) and
 * the ratio is invariant to box size (2.05 at the 120x65 floor). Equalising the
 * two insets is the only lever that moves it, so ring layouts use square slots.
 */
export const RADIAL_BOX_MAX = 170;

export function radialBoxCandidates(): Array<{ width: number; height: number }> {
  const out: Array<{ width: number; height: number }> = [];
  for (let s = RADIAL_BOX_MAX; s >= MEDIA_MIN_BOX.width; s--) {
    out.push({ width: s, height: s });
  }
  return out;
}

/**
 * Square slots first, then the media aspect as a fallback.
 *
 * Square slots are what keep ring arrows even, but a square floor of 120x120
 * needs more vertical room than the shared 120x65 floor, so a five-node ring
 * cannot fit them on small canvases. Falling through to the aspect box keeps
 * those canvases working, at the cost of the arrow ratio.
 */
export function radialBoxCandidatesWithFallback(): Array<{ width: number; height: number }> {
  return [...radialBoxCandidates(), ...mediaBoxCandidates()];
}

function clampInt(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

/**
 * Axis-aligned rectangle addressed by its centre, unlike `Bounds` which is
 * top-left based. Ring maths works outward from node centres, so keeping the
 * centre convention avoids a half-width conversion at every step.
 */
export interface CenteredRect {
  /** Centre x. */
  x: number;
  /** Centre y. */
  y: number;
  width: number;
  height: number;
}

/** True when two axis-aligned rectangles share interior area. */
export function rectsOverlap(a: CenteredRect, b: CenteredRect): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2
  );
}

/** First overlapping pair among `rects`, or null when they are all disjoint. */
export function findOverlap(rects: CenteredRect[]): [CenteredRect, CenteredRect] | null {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      if (rectsOverlap(a, b)) return [a, b];
    }
  }
  return null;
}
