import fieldTilesetUrl from '../assets/field-tileset.png';

/**
 * Tiled pixel-art turf from the "Pixel Art Top-Down Tileset" (CC-BY-SA-4.0).
 *
 * The tileset is a 120×216 packed sheet of 24×24 tiles (5 cols × 9 rows).
 * Frames are numbered row-major: frame = row * 5 + col.
 *
 * The field tiles the seamless inner grass across the *entire* canvas (not just
 * the 30×30 gameplay grid), so the landscape margins read as more field rather
 * than dark dead space. The 30×30 zone gets occasional decorative variety
 * (wheat, tall grass) seeded per cell for visual interest.
 */

export const TURF_TEXTURE_KEY = 'field-tileset';

/** Native tile size on the new sheet. */
export const TURF_TILE_PX = 24;

/** Columns on the sheet. */
const SHEET_COLS = 5;

export const TURF_SHEET_URL = fieldTilesetUrl;

/**
 * Frame indices on the 5-column sheet (frame = row * COLS + col).
 *
 * Only the fully-opaque seamless tiles are used for the field. Edge tiles with
 * transparency are not needed — the field extends infinitely and has no border
 * in the turf layer (the boundary is drawn separately by `MatchScene`).
 */
export const TURF_FRAMES = {
  /** Seamless inner grass — the base fill for the entire canvas. */
  grassInner: 1 * SHEET_COLS + 1,  // (col 1, row 1) = frame 6

  /** Decorative variants for the 30×30 playfield. */
  wheat1: 6 * SHEET_COLS + 0,      // (col 0, row 6) = frame 30
  wheat2: 6 * SHEET_COLS + 1,      // (col 1, row 6) = frame 31
  wheat3: 6 * SHEET_COLS + 2,      // (col 2, row 6) = frame 32
  wheat4: 6 * SHEET_COLS + 3,      // (col 3, row 6) = frame 33
  wheat5: 6 * SHEET_COLS + 4,      // (col 4, row 6) = frame 34

  grassVar1: 7 * SHEET_COLS + 0,   // (col 0, row 7) = frame 35
  grassVar2: 7 * SHEET_COLS + 1,   // (col 1, row 7) = frame 36
  grassVar3: 7 * SHEET_COLS + 2,   // (col 2, row 7) = frame 37
  grassVar4: 7 * SHEET_COLS + 3,   // (col 3, row 7) = frame 38
  grassVar5: 7 * SHEET_COLS + 4,   // (col 4, row 7) = frame 39
} as const;

/** Frames used for the base fill (entire canvas). */
export const GROUND_FRAMES: readonly number[] = [TURF_FRAMES.grassInner];

/**
 * Decorative accent frames scattered onto the 30×30 playfield for variety.
 * Kept sparse so they read as texture, not clutter — and so they do not
 * compete with pellets or snake bodies.
 */
export const DECOR_FRAMES: readonly number[] = [
  TURF_FRAMES.grassVar1,
  TURF_FRAMES.grassVar2,
  TURF_FRAMES.grassVar3,
  TURF_FRAMES.grassVar4,
  TURF_FRAMES.grassVar5,
];

/** Share of playfield cells that receive a decorative accent. */
const DECOR_SHARE = 0.08;

/**
 * Deterministic 32-bit LCG, matching the one the renderer already used for
 * field decoration. Seeded per match so every client paints an identical field,
 * and so the same seed replays identically.
 */
export function turfRandom(seed: number): () => number {
  let value = (seed || 0x9e3779b9) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

/** Pick a ground frame from a [0,1) sample — always the seamless grass. */
export function turfFrameFor(): number {
  return TURF_FRAMES.grassInner;
}

/**
 * Build the turf layout for the 30×30 playfield, row-major, `size * size`
 * entries.
 *
 * Most cells get the seamless grass base. A small percentage receive a
 * decorative grass variant to break the uniformity.
 */
export function buildTurfLayout(seed: number, size: number): Uint8Array {
  const random = turfRandom(seed);
  const layout = new Uint8Array(size * size);
  for (let index = 0; index < layout.length; index++) {
    const sample = random();
    if (sample < DECOR_SHARE) {
      // Pick a decorative accent
      const decorIndex = Math.floor(random() * DECOR_FRAMES.length);
      layout[index] = DECOR_FRAMES[decorIndex];
    } else {
      layout[index] = TURF_FRAMES.grassInner;
    }
  }
  return layout;
}
