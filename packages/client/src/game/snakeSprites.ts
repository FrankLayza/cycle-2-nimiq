/**
 * Snake sprite mapping for the external Snake.png sprite sheet.
 *
 * The sheet is 256×352 (16 cols × 22 rows of 16×16 tiles). Three colour
 * sections each occupy 7 rows:
 *
 *   Rows 0-6:   Yellow/Orange
 *   Rows 7-13:  Green
 *   Rows 14-20: Blue
 *   Row  21:    Extra (unused)
 *
 * Within each colour, the body pieces live on a single row:
 *   Yellow body: row 2  (cols 0-9)
 *   Green body:  row 9  (cols 0-9)
 *   Blue body:   row 16 (cols 0-9)
 *
 * Body piece layout per row (cols 0-9):
 *   0: head up        1: straight horizontal   2: cross/T-junction
 *   3: straight vertical  4: corner (top-right)    5: corner (top-left)
 *   6: head right     7: tail right             8: tail up
 *   9: tail left
 *
 * The pieces are pre-rotated in the sheet, which differs from the old
 * procedural system that authored everything facing +x and rotated in-engine.
 * To stay compatible with the existing `angleForDirection()` / `cornerAngle()`
 * helpers, we map each semantic piece (head, straight, corner, tail) to a
 * *canonical* frame facing +x and let the renderer rotate as before.
 *
 * Kept Phaser-free so the mapping is unit-testable without a canvas.
 */

/** Native pixel size of one piece — one grid cell. */
export const SNAKE_SPRITE_PX = 16;


/**
 * Piece names, matching the old PIECE_ORDER so frame-index maths stays
 * compatible with `snakeFrame()`.
 */
export const PIECE_ORDER = ['head', 'straight', 'corner', 'tail'] as const;
export type PieceName = (typeof PIECE_ORDER)[number];

/**
 * Canonical column on the body row for each piece type.
 * These are the columns that face *right* (+x), matching the old convention.
 *
 * head:     col 6 faces right
 * straight: col 1 faces horizontal (right)
 * corner:   col 4 connects top and right edges (canonical left-bottom elbow
 *           equivalent when rotated — we use col 5 which connects top-left)
 * tail:     col 7 faces right
 */
const PIECE_COL: Record<PieceName, number> = {
  head: 6,
  straight: 1,
  corner: 5,
  tail: 7,
};

/** Pixel roles — kept for potential procedural tinting of seat 3. */
export const PX = {
  empty: 0,
  outline: 1,
  base: 2,
  highlight: 3,
  eye: 4,
  pupil: 5,
} as const;

/**
 * Body-row index for each seat colour on the sheet.
 * Seats 0-2 map directly. Seat 3 (Violet) has no native colour on the sheet,
 * so it reuses the Yellow row and is tinted at texture-build time.
 */
const SEAT_BODY_ROW = [2, 9, 16, 2] as const;

/** Piece indices, matching `PIECE_ORDER`. */
export const PIECE = {
  head: PIECE_ORDER.indexOf('head'),
  straight: PIECE_ORDER.indexOf('straight'),
  corner: PIECE_ORDER.indexOf('corner'),
  tail: PIECE_ORDER.indexOf('tail'),
} as const;

/**
 * Frame index for a seat/piece pair.
 *
 * Frames are laid out in the rebuilt atlas as: seat-major, piece-minor.
 * Total frames = 4 seats × 4 pieces = 16.
 */
export function snakeFrame(seat: number, piece: number): number {
  const seatCount = 4;
  const index = ((Math.trunc(seat) % seatCount) + seatCount) % seatCount;
  return index * PIECE_ORDER.length + piece;
}

/**
 * Source rectangle on the original Snake.png sheet for a given seat and piece.
 *
 * Used by `snakeTexture.ts` to blit from the loaded image into the runtime
 * atlas. Returns pixel coordinates.
 */
export function sourceRect(
  seat: number,
  pieceName: PieceName
): { x: number; y: number; w: number; h: number } {
  const seatCount = 4;
  const seatIndex = ((Math.trunc(seat) % seatCount) + seatCount) % seatCount;
  const row = SEAT_BODY_ROW[seatIndex];
  const col = PIECE_COL[pieceName];
  return {
    x: col * SNAKE_SPRITE_PX,
    y: row * SNAKE_SPRITE_PX,
    w: SNAKE_SPRITE_PX,
    h: SNAKE_SPRITE_PX,
  };
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
 * direction of travel. The canonical sprite connects its left and bottom edges.
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
