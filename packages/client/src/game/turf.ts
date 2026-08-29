import turfSheetUrl from '../assets/tiny-town.png';

/**
 * Tiled pixel-art turf, from the CC0 Kenney "Tiny Town" pack.
 *
 * Replaces the procedural lawn, whose mow stripes were drawn one per gameplay
 * column and so drew the eye straight to the 30x30 lattice — the field read as
 * graph paper. Tiles carry their own texture, and the variant is chosen per cell
 * from the match seed rather than from the cell's parity, so nothing lines up
 * with the grid.
 *
 * See `src/assets/ATTRIBUTION.md` for licence and sheet layout.
 */

export const TURF_TEXTURE_KEY = 'tiny-town';

/** Native tile size on the Kenney sheet. */
export const TURF_TILE_PX = 16;

export const TURF_SHEET_URL = turfSheetUrl;

/**
 * Ground-cover frames on the packed sheet.
 *
 * `flowers` is deliberately NOT used on the playfield. Rendered at cell size it
 * is a high-contrast orange mark on green and reads as a collectible — players
 * chase it, and it competes with the two real pellet types. It stays named here
 * because it is what sheet frame 2 is, not because the field draws it.
 */
export const TURF_FRAMES = {
  plain: 0,
  tufts: 1,
  flowers: 2,
} as const;

/** Frames the field may actually use. */
export const GROUND_FRAMES: readonly number[] = [TURF_FRAMES.plain, TURF_FRAMES.tufts];

/**
 * Share of cells that get plain grass; the rest get tufts. Tufts are a
 * low-contrast darker speckle, so they read as texture at any density.
 */
const PLAIN_SHARE = 0.8;

/**
 * Deterministic 32-bit LCG, matching the one the renderer already used for field
 * decoration. Seeded per match so every client paints an identical field, and so
 * the same seed replays identically.
 */
export function turfRandom(seed: number): () => number {
  let value = (seed || 0x9e3779b9) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

/** Pick a ground frame from a [0,1) sample. */
export function turfFrameFor(sample: number): number {
  return sample < PLAIN_SHARE ? TURF_FRAMES.plain : TURF_FRAMES.tufts;
}

/**
 * Build the full turf layout for a match, row-major, `size * size` entries.
 *
 * Returned as a flat array so the scene can stamp it without re-deriving the
 * sequence, and so the layout is unit-testable without a canvas.
 */
export function buildTurfLayout(seed: number, size: number): Uint8Array {
  const random = turfRandom(seed);
  const layout = new Uint8Array(size * size);
  for (let index = 0; index < layout.length; index++) {
    layout[index] = turfFrameFor(random());
  }
  return layout;
}
