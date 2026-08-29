import { describe, expect, it } from 'vitest';
import {
  PIECE_ORDER,
  PX,
  SNAKE_SPRITE_PX,
  angleForDirection,
  cornerAngle,
  pieceMask,
} from '../src/game/snakeSprites';
import type { PieceName } from '../src/game/snakeSprites';

const S = SNAKE_SPRITE_PX;
const MID = S / 2;

function at(mask: Uint8Array, x: number, y: number): number {
  return mask[y * S + x];
}

function column(mask: Uint8Array, x: number): number[] {
  return Array.from({ length: S }, (_, y) => at(mask, x, y));
}

function row(mask: Uint8Array, y: number): number[] {
  return Array.from({ length: S }, (_, x) => at(mask, x, y));
}

const solid = (values: number[]) => values.filter((v) => v !== PX.empty).length;

describe('snake piece masks', () => {
  it('produces one cell-sized mask per piece', () => {
    for (const name of PIECE_ORDER) {
      expect(pieceMask(name)).toHaveLength(S * S);
    }
  });

  it('leaves connecting edges unoutlined so joined cells show no seam', () => {
    /*
     * Only the *interior* of a connecting edge must be free of outline. A band's
     * own top and bottom boundary pixels are outlined in every column, including
     * the first and last, because those are the snake's flanks rather than a join.
     * What would produce a visible seam is an outline across the middle of the
     * edge, so that is what this checks.
     */
    const straight = pieceMask('straight');
    for (const x of [0, S - 1]) {
      expect(at(straight, x, MID)).not.toBe(PX.empty);
      expect(at(straight, x, MID)).not.toBe(PX.outline);
    }
    // The run is the same thickness at both edges as in the middle.
    expect(solid(column(straight, 0))).toBe(solid(column(straight, MID)));

    // A corner connects left and bottom.
    const corner = pieceMask('corner');
    expect(at(corner, 0, MID)).not.toBe(PX.empty);
    expect(at(corner, 0, MID)).not.toBe(PX.outline);
    expect(at(corner, MID, S - 1)).not.toBe(PX.empty);
    expect(at(corner, MID, S - 1)).not.toBe(PX.outline);
  });

  it('caps the non-connecting edges', () => {
    // The head connects only behind it, so its front is closed off entirely.
    const head = pieceMask('head');
    expect(at(head, 0, MID)).not.toBe(PX.outline);
    expect(solid(column(head, S - 1))).toBe(0);

    // A corner does not continue through its right or top edge.
    const corner = pieceMask('corner');
    expect(solid(column(corner, S - 1))).toBe(0);
    expect(solid(row(corner, 0))).toBe(0);
  });

  it('gives the head two eyes, each with a pupil', () => {
    const head = pieceMask('head');
    expect(head.filter((v) => v === PX.eye).length).toBeGreaterThanOrEqual(14);
    expect(head.filter((v) => v === PX.pupil).length).toBe(2);
  });

  it('tapers the tail toward its tip', () => {
    const tail = pieceMask('tail');
    const nearBody = solid(column(tail, 1));
    const nearTip = solid(column(tail, S - 4));
    expect(nearTip).toBeGreaterThan(0);
    expect(nearTip).toBeLessThan(nearBody);
  });

  it('carries a lit contour, so the body is not flat', () => {
    for (const name of ['straight', 'corner', 'head'] as PieceName[]) {
      expect(pieceMask(name).filter((v) => v === PX.highlight).length).toBeGreaterThan(0);
    }
  });

  it('gives each seat a distinct dorsal marking', () => {
    const signatures = new Set([0, 1, 2, 3].map((p) => pieceMask('straight', p).join('')));
    expect(signatures.size).toBe(4);
  });

  it('does not mark the head or tail, where a spine would read as damage', () => {
    expect(pieceMask('head', 0)).toEqual(pieceMask('head', 2));
    expect(pieceMask('tail', 0)).toEqual(pieceMask('tail', 3));
  });

  it('keeps the body inside its cell so runs never bleed into the next lane', () => {
    for (const name of PIECE_ORDER) {
      const mask = pieceMask(name);
      // Nothing may touch the top edge except the corner's vertical arm, which
      // exits through the bottom — no piece is open at the top.
      expect(solid(row(mask, 0))).toBe(0);
    }
  });
});

describe('piece orientation', () => {
  it('maps each grid direction to a quarter turn', () => {
    expect(angleForDirection(1, 0)).toBe(0);
    expect(angleForDirection(0, 1)).toBe(90);
    expect(angleForDirection(-1, 0)).toBe(180);
    expect(angleForDirection(0, -1)).toBe(270);
  });

  it('orients a corner by which edges it connects, not direction of travel', () => {
    // Entering from the left and leaving downward occupies the same elbow as
    // entering from below and leaving left; both must pick the same rotation.
    expect(cornerAngle(-1, 0, 0, 1)).toBe(cornerAngle(0, 1, -1, 0));
    expect(cornerAngle(1, 0, 0, -1)).toBe(cornerAngle(0, -1, 1, 0));
  });

  it('covers all four elbows with four distinct rotations', () => {
    const angles = new Set([
      cornerAngle(-1, 0, 0, 1),
      cornerAngle(-1, 0, 0, -1),
      cornerAngle(1, 0, 0, -1),
      cornerAngle(1, 0, 0, 1),
    ]);
    expect(angles).toEqual(new Set([0, 90, 180, 270]));
  });
});
