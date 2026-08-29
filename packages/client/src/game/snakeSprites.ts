/**
 * Procedural pixel-art snake pieces.
 *
 * Sourced sprite sheets did not fit: top-down grid snakes need a per-direction
 * head plus corner elbows and a tail, and the packs available were side-or
 * front-view characters with a baked-in "down" and only three fixed hues. Since
 * the arena is a 30x30 grid of 16px tiles, the pieces are generated here instead —
 * correct geometry, four seat colours, and the same 16px lattice as the turf.
 *
 * Shapes are rasterised as a distance field around a centreline polyline rather
 * than assembled from rectangles. That is what makes turns read as *curved*: a
 * corner is a bent centreline, so its elbow rounds on both the inner and outer
 * edge instead of meeting at a hard right angle. Movement itself stays grid-locked
 * (the sim is integer-only and must remain so), but the body no longer looks like
 * a chain of beads hinged at 90 degrees.
 *
 * Kept free of Phaser so the rasteriser is unit-testable without a canvas.
 */

import { SEAT_SKINS } from './theme';

/** Native pixel size of one piece — one grid cell, matching the turf tile. */
export const SNAKE_SPRITE_PX = 16;

/**
 * Every piece is authored facing +x, connecting on its left edge. The renderer
 * rotates by whole quarter turns, which is lossless for pixel art.
 */
export const PIECE_ORDER = ['head', 'straight', 'corner', 'tail'] as const;
export type PieceName = (typeof PIECE_ORDER)[number];

/** Pixel roles. Index into a per-seat palette at texture-build time. */
export const PX = {
  empty: 0,
  outline: 1,
  base: 2,
  highlight: 3,
  eye: 4,
  pupil: 5,
} as const;

/**
 * Half-thickness of the body, in pixels.
 *
 * 5.6 of a 16px cell keeps a channel between parallel runs so a coiled snake
 * stays readable, without the body looking spindly. At 6 adjacent runs touched
 * and read as one solid tube; at 5 the body was a thin ribbon in its lane.
 */
const BODY_RADIUS = 5.6;
/** The head is slightly fatter so it reads as the front of the animal. */
const HEAD_RADIUS = 6.3;
/** The tail narrows to this by its tip. */
const TAIL_TIP_RADIUS = 1.2;

const MID = SNAKE_SPRITE_PX / 2;

interface Hit {
  /** Distance from the centreline. */
  distance: number;
  /** Position along the centreline, 0..1, for tapering. */
  along: number;
}

/** Distance from a point to a segment, plus how far along that segment it fell. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): Hit {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return { distance: Math.hypot(px - cx, py - cy), along: t };
}

/**
 * Centreline for each piece, in pixel space. Lines overshoot the sprite bounds on
 * connecting edges so adjacent cells butt together with no seam.
 */
function centreline(name: PieceName): { points: [number, number][]; taper: boolean } {
  switch (name) {
    case 'straight':
      return { points: [[-2, MID], [SNAKE_SPRITE_PX + 2, MID]], taper: false };
    case 'corner':
      // In on the left, out through the bottom. The bend is what rounds.
      return { points: [[-2, MID], [MID, MID], [MID, SNAKE_SPRITE_PX + 2]], taper: false };
    case 'head':
      // Stops short of the right edge so the front is capped, not full-bleed.
      return { points: [[-2, MID], [SNAKE_SPRITE_PX - 8, MID]], taper: false };
    case 'tail':
      return { points: [[-2, MID], [SNAKE_SPRITE_PX - 3, MID]], taper: true };
  }
}

function radiusFor(name: PieceName): number {
  return name === 'head' ? HEAD_RADIUS : BODY_RADIUS;
}

/** Is this pixel centre within the piece's body? */
function isInside(name: PieceName, x: number, y: number): boolean {
  const { points, taper } = centreline(name);
  const radius = radiusFor(name);
  const px = x + 0.5;
  const py = y + 0.5;

  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const hit = toSegment(px, py, ax, ay, bx, by);
    const limit = taper ? radius + (TAIL_TIP_RADIUS - radius) * hit.along : radius;
    if (hit.distance <= limit) return true;
  }
  return false;
}

/**
 * Edges the piece connects through. Pixels on these edges must not be outlined,
 * or every join would show a dark seam.
 */
function openEdges(name: PieceName): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
  return {
    left: true,
    right: name === 'straight',
    top: false,
    bottom: name === 'corner',
  };
}

/** Treat out-of-bounds as solid across connecting edges, so joins stay seamless. */
function insideOrOpen(name: PieceName, x: number, y: number): boolean {
  const edges = openEdges(name);
  if (x < 0) return edges.left;
  if (x >= SNAKE_SPRITE_PX) return edges.right;
  if (y < 0) return edges.top;
  if (y >= SNAKE_SPRITE_PX) return edges.bottom;
  return isInside(name, x, y);
}

/** Eye placement for the head: two blocks set forward of centre, off the axis. */
const EYE_BLOCKS: { x: number; y: number }[] = [
  { x: 8, y: 4 },
  { x: 8, y: 9 },
];
const EYE_SIZE = 3;

/**
 * Rasterise one piece.
 *
 * `pattern` stamps a per-seat dorsal mark on the body pieces. Colour alone is not
 * enough to tell seats apart — coral and teal are the common red-green confusion
 * pair — so the marking varies by seat as a second, hue-independent cue.
 */
export function pieceMask(name: PieceName, pattern = 0): Uint8Array {
  const size = SNAKE_SPRITE_PX;
  const mask = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isInside(name, x, y)) continue;
      const edge =
        !insideOrOpen(name, x - 1, y) ||
        !insideOrOpen(name, x + 1, y) ||
        !insideOrOpen(name, x, y - 1) ||
        !insideOrOpen(name, x, y + 1);
      mask[y * size + x] = edge ? PX.outline : PX.base;
    }
  }

  /*
   * A one-pixel highlight tracing the shape's upper contour, lit from above to
   * match the scene's light direction.
   *
   * The lookup is two rows up, not one. A pixel whose immediate neighbour above is
   * outside has already been marked `outline` by the pass above, so testing `y - 1`
   * here can never match anything and the highlight silently vanished. Testing
   * `y - 2` lands on the row just *inside* the outline, which is the intended
   * single-pixel contour.
   */
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x] !== PX.base) continue;
      if (!insideOrOpen(name, x, y - 2)) mask[y * size + x] = PX.highlight;
    }
  }

  if (name === 'head') {
    for (const block of EYE_BLOCKS) {
      for (let dy = 0; dy < EYE_SIZE; dy++) {
        for (let dx = 0; dx < EYE_SIZE; dx++) {
          const x = block.x + dx;
          const y = block.y + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          if (mask[y * size + x] === PX.empty) continue;
          mask[y * size + x] = PX.eye;
        }
      }
      // Pupil toward the front, so the head reads as looking where it travels.
      const px = block.x + EYE_SIZE - 1;
      const py = block.y + 1;
      if (mask[py * size + px] === PX.eye) mask[py * size + px] = PX.pupil;
    }
    return mask;
  }

  if (name === 'tail') return mask;

  // Dorsal marking, body pieces only.
  stampPattern(mask, pattern);
  return mask;
}

function stampPattern(mask: Uint8Array, pattern: number): void {
  const size = SNAKE_SPRITE_PX;
  const set = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    if (mask[y * size + x] !== PX.base) return;
    mask[y * size + x] = PX.highlight;
  };

  switch (((pattern % 4) + 4) % 4) {
    case 0:
      // Solid spine.
      for (let x = 0; x < size; x++) set(x, MID);
      break;
    case 1:
      // Dashed spine.
      for (let x = 0; x < size; x++) if (x % 4 < 2) set(x, MID);
      break;
    case 2:
      // Twin rails.
      for (let x = 0; x < size; x++) {
        set(x, MID - 2);
        set(x, MID + 1);
      }
      break;
    default:
      // Dotted spine.
      for (let x = 0; x < size; x++) {
        if (x % 5 !== 0) continue;
        set(x, MID - 1);
        set(x, MID);
      }
      break;
  }
}

/** Piece indices, matching `PIECE_ORDER`. */
export const PIECE = {
  head: PIECE_ORDER.indexOf('head'),
  straight: PIECE_ORDER.indexOf('straight'),
  corner: PIECE_ORDER.indexOf('corner'),
  tail: PIECE_ORDER.indexOf('tail'),
} as const;

/** Frame index for a seat/piece pair. Frames are laid out row-major by seat. */
export function snakeFrame(seat: number, piece: number): number {
  const seats = SEAT_SKINS.length;
  const index = ((Math.trunc(seat) % seats) + seats) % seats;
  return index * PIECE_ORDER.length + piece;
}

/** Quarter-turn angle, in degrees, for a unit grid direction. Pieces face +x. */
export function angleForDirection(dx: number, dy: number): number {
  if (dx > 0) return 0;
  if (dy > 0) return 90;
  if (dx < 0) return 180;
  if (dy < 0) return 270;
  return 0;
}

/** Direction bits used to identify which two edges a corner connects. */
const EDGE = { left: 1, up: 2, right: 4, down: 8 } as const;

function edgeBit(dx: number, dy: number): number {
  if (dx > 0) return EDGE.right;
  if (dx < 0) return EDGE.left;
  if (dy > 0) return EDGE.down;
  return EDGE.up;
}

/**
 * Angle for a corner piece.
 *
 * The shape depends only on *which two edges* the cell connects, not on the
 * direction of travel — a body entering from the left and leaving downward
 * occupies the same elbow as one entering from below and leaving left. The
 * canonical sprite connects its left and bottom edges.
 */
const CORNER_ANGLES: Record<number, number> = {
  [EDGE.left | EDGE.down]: 0,
  [EDGE.left | EDGE.up]: 90,
  [EDGE.right | EDGE.up]: 180,
  [EDGE.right | EDGE.down]: 270,
};

export function cornerAngle(
  towardTailX: number,
  towardTailY: number,
  towardHeadX: number,
  towardHeadY: number
): number {
  const bits = edgeBit(towardTailX, towardTailY) | edgeBit(towardHeadX, towardHeadY);
  return CORNER_ANGLES[bits] ?? 0;
}
