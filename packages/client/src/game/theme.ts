/**
 * Arena render theme — the single source of truth for the colours and lighting
 * the Phaser renderer uses.
 *
 * Two rules this module exists to enforce:
 *
 * 1. **One palette.** The values below mirror the Fresh Rink `@theme` tokens in
 *    `src/index.css`. The renderer previously carried its own set of magic hex
 *    literals that had drifted from those tokens; everything now derives from
 *    here. Keep the two in sync when a token changes.
 * 2. **One light source.** Every shadow and specular highlight is derived from
 *    `LIGHT` rather than each draw call inventing its own offset, which is what
 *    made the old field read as noise instead of depth.
 *
 * Deliberately Phaser-free so it can be unit-tested without a canvas. Colours
 * are plain `0xRRGGBB` integers because that is what Phaser's Graphics API takes.
 */

/** Fresh Rink tokens (mirrors `--color-*` in `src/index.css`). */
export const PALETTE = {
  ink: 0x172235,
  inkDeep: 0x0e1624,
  cream: 0xf5f3ee,
  white: 0xffffff,

  grass: 0x5b9e4a,
  grassLight: 0x8fd46a,
  grassDeep: 0x3f7a33,
  grassSoft: 0xe8f4df,

  gold: 0xf59e0b,
  goldDeep: 0xb45309,
  lemon: 0xf7e04d,
  lemonSoft: 0xfff9d8,
} as const;

/** Warm light colour used for specular highlights, so gloss is not flat white. */
const WARM_LIGHT = 0xfff4dc;

export function clamp01(t: number): number {
  if (Number.isNaN(t)) return 0;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Linear blend between two `0xRRGGBB` colours. `t = 0` returns `a`, `t = 1` returns `b`. */
export function mixHex(a: number, b: number, t: number): number {
  const k = clamp01(t);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const blue = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | blue;
}

/** Parse `#rgb` / `#rrggbb` (with or without `#`). Returns `fallback` when unparseable. */
export function parseHexColor(input: string | undefined | null, fallback: number): number {
  if (!input) return fallback;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return fallback;
  const digits = match[1];
  if (digits.length === 3) {
    const [r, g, b] = digits;
    return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
  }
  return parseInt(digits, 16);
}

/**
 * Darker rim colour for a snake body. Mixes toward the deep ink rather than to
 * black so shadows stay slightly cool, which is what sells depth on green turf.
 */
export function shadeOf(base: number): number {
  return mixHex(base, PALETTE.inkDeep, 0.34);
}

/** Lit face colour for a snake body. */
export function highlightOf(base: number): number {
  return mixHex(base, WARM_LIGHT, 0.55);
}

export interface SeatSkin {
  seat: number;
  /** Display name for the HUD / lobby. */
  name: string;
  /** CSS hex — matches what the server sends as `snake.color`. */
  hex: string;
  base: number;
  shade: number;
  highlight: number;
  /**
   * Dorsal marking variant, for colour-blind-safe identification.
   *
   * Colour alone is not sufficient: seats 0 and 1 (coral / teal) are the classic
   * red-green confusion pair under deuteranopia, which is the most common form.
   * The renderer varies the body marking by this index so seats stay tellable
   * apart without relying on hue.
   */
  pattern: number;
}

/**
 * Canonical seat identities. Four are defined so the renderer is ready for the
 * 3-4 player rooms; the sim itself is still 1v1 (`SPAWNS` in `@snake/sim` has two
 * seats) and expanding it needs a deliberate `SIM_VERSION` bump.
 *
 * Hues avoid the turf greens and the bounty gold so nothing competes with the
 * field or the pickups.
 */
const SEAT_DEFS: readonly { name: string; hex: string }[] = [
  { name: 'Coral', hex: '#ff686b' },
  { name: 'Teal', hex: '#35c982' },
  { name: 'Azure', hex: '#4d9bff' },
  { name: 'Violet', hex: '#c46bff' },
] as const;

export const SEAT_SKINS: readonly SeatSkin[] = SEAT_DEFS.map((def, seat) => {
  const base = parseHexColor(def.hex, 0xff686b);
  return {
    seat,
    name: def.name,
    hex: def.hex,
    base,
    shade: shadeOf(base),
    highlight: highlightOf(base),
    pattern: seat,
  };
});

/**
 * Resolve the skin for a seat, honouring a server-supplied colour when present.
 *
 * The renderer used to hardcode shade/highlight per seat index, which silently
 * ignored `snake.color` and broke for any seat beyond the first two. Deriving
 * both from the base colour means any number of seats and any custom colour
 * renders correctly.
 */
export function skinFor(seat: number, hex?: string | null): SeatSkin {
  const count = SEAT_SKINS.length;
  const index = ((Math.trunc(seat) % count) + count) % count;
  const canonical = SEAT_SKINS[index];
  const base = parseHexColor(hex, canonical.base);
  if (base === canonical.base) return canonical;
  return {
    ...canonical,
    hex: hex ?? canonical.hex,
    base,
    shade: shadeOf(base),
    highlight: highlightOf(base),
  };
}

/**
 * The scene's single light. Direction is a unit vector pointing from the light
 * toward the scene — the light sits up and to the left, so contact shadows fall
 * down and to the right and speculars sit up-left.
 *
 * Offsets are expressed in *cell widths*, never raw pixels, so they stay correct
 * at any canvas size or device pixel ratio.
 */
export const LIGHT = {
  x: 0.5145,
  y: 0.8575,
  /** Contact-shadow offset, in cell widths. */
  shadowCells: 0.11,
  /** Specular offset, in cell widths. */
  specularCells: 0.15,
  /** Ground shadow tint — cool green, so it reads as turf occlusion. */
  groundShadow: 0x14351b,
  groundShadowAlpha: 0.28,
} as const;

export interface Offset {
  x: number;
  y: number;
}

/** Contact-shadow offset in pixels for the current cell size. */
export function shadowOffset(cellPx: number): Offset {
  return { x: LIGHT.x * LIGHT.shadowCells * cellPx, y: LIGHT.y * LIGHT.shadowCells * cellPx };
}

/** Specular offset in pixels for the current cell size (opposite the shadow). */
export function specularOffset(cellPx: number): Offset {
  return { x: -LIGHT.x * LIGHT.specularCells * cellPx, y: -LIGHT.y * LIGHT.specularCells * cellPx };
}

/**
 * Turf ramp, derived from the grass tokens so the field is one coherent set of
 * values instead of six unrelated literals.
 */
export const FIELD = {
  /**
   * Camera background — the area outside the square pitch.
   *
   * The arena is a fixed 30x30 square that must stay wholly visible, so in
   * landscape it fills the height and leaves a margin either side. This was a
   * pale green that read as dead space; a dark surround instead reads as an
   * intentional stadium and lets the lit turf carry the eye. The match HUD rails
   * sit over these margins.
   */
  backdrop: mixHex(PALETTE.inkDeep, PALETTE.grassDeep, 0.18),
  /** Drop shadow under the whole stadium. */
  shadow: mixHex(PALETTE.grassDeep, PALETTE.inkDeep, 0.55),
  /** Outer bevel rim. */
  rim: PALETTE.grassDeep,
  /** Recessed inner bevel between rim and turf. */
  rimInner: mixHex(PALETTE.grassDeep, PALETTE.inkDeep, 0.3),
  /** Main turf surface. */
  turf: mixHex(PALETTE.grassLight, PALETTE.grass, 0.35),
  /** Mow stripe, lit pass. */
  stripeLight: mixHex(PALETTE.grassLight, WARM_LIGHT, 0.16),
  /** Mow stripe, shaded pass. */
  stripeDark: mixHex(PALETTE.grass, PALETTE.grassDeep, 0.4),
  /** Cross-band texture. */
  band: mixHex(PALETTE.grassDeep, PALETTE.inkDeep, 0.2),
  /** Chalk markings. */
  chalk: PALETTE.white,
  /** Clover leaves. */
  clover: mixHex(PALETTE.grass, PALETTE.grassDeep, 0.35),
  /** Ground shadow under decorations. */
  decorShadow: mixHex(PALETTE.grassDeep, PALETTE.inkDeep, 0.5),
  /** Zone outside the active shrinking boundary. */
  forbidden: mixHex(PALETTE.grassDeep, PALETTE.inkDeep, 0.62),
} as const;

/** Pellet colours. Type 0 = normal, type 1 = bounty. */
export const PELLET = {
  bounty: PALETTE.gold,
  bountyShade: PALETTE.goldDeep,
  bountyFacet: PALETTE.lemonSoft,
} as const;

/**
 * Reference cell size the renderer's hand-tuned pixel constants were authored
 * against. `MatchScene` converts them with `value * (cellPx / REFERENCE_CELL_PX)`
 * so detail geometry scales with the canvas instead of detaching from its shape
 * at other sizes — which is what happened to the pellet stem and leaf.
 */
export const REFERENCE_CELL_PX = 24;
