import { describe, expect, it } from 'vitest';
import {
  GROUND_FRAMES,
  TURF_FRAMES,
  TURF_TILE_PX,
  buildTurfLayout,
  turfFrameFor,
  turfRandom,
} from '../src/game/turf';

describe('turf variant selection', () => {
  it('maps samples across the whole [0,1) range to a ground frame', () => {
    expect(turfFrameFor(0)).toBe(TURF_FRAMES.plain);
    expect(turfFrameFor(0.79)).toBe(TURF_FRAMES.plain);
    expect(turfFrameFor(0.8)).toBe(TURF_FRAMES.tufts);
    expect(turfFrameFor(0.999)).toBe(TURF_FRAMES.tufts);
  });

  it('never places the flower frame on the playfield', () => {
    // Rendered at cell size the flower tile is a high-contrast orange mark on
    // green: it reads as a collectible and competes with the two pellet types.
    for (let i = 0; i <= 1000; i++) {
      expect(turfFrameFor(i / 1000)).not.toBe(TURF_FRAMES.flowers);
      expect(GROUND_FRAMES).toContain(turfFrameFor(i / 1000));
    }
  });
});

describe('turf layout', () => {
  it('fills every cell of the grid', () => {
    const layout = buildTurfLayout(12345, 30);
    expect(layout).toHaveLength(900);
  });

  it('is deterministic per seed, so every client paints an identical field', () => {
    expect(buildTurfLayout(777, 30)).toEqual(buildTurfLayout(777, 30));
  });

  it('differs between seeds', () => {
    expect(buildTurfLayout(1, 30)).not.toEqual(buildTurfLayout(2, 30));
  });

  it('does not correlate with the cell grid', () => {
    // The old lawn striped by column parity, which drew the eye straight to the
    // 30x30 lattice. Variation must not track x, y or their parity.
    const size = 30;
    const layout = buildTurfLayout(4242, size);
    const columnSignatures = new Set<string>();
    for (let x = 0; x < size; x++) {
      const column: number[] = [];
      for (let y = 0; y < size; y++) column.push(layout[y * size + x]);
      columnSignatures.add(column.join(''));
    }
    // Every column distinct => no repeating per-column pattern.
    expect(columnSignatures.size).toBe(size);
  });

  it('keeps plain grass dominant so tufts read as texture, not pattern', () => {
    const layout = buildTurfLayout(99, 30);
    const counts = { plain: 0, tufts: 0 };
    for (const frame of layout) {
      if (frame === TURF_FRAMES.plain) counts.plain++;
      else counts.tufts++;
    }
    expect(counts.plain).toBeGreaterThan(counts.tufts);
    expect(counts.tufts / layout.length).toBeGreaterThan(0.05);
    expect(counts.tufts / layout.length).toBeLessThan(0.35);
  });

  it('survives a zero seed without collapsing to one frame', () => {
    const layout = buildTurfLayout(0, 30);
    expect(new Set(layout).size).toBeGreaterThan(1);
  });
});

describe('turf rng', () => {
  it('stays within [0,1)', () => {
    const random = turfRandom(2026);
    for (let i = 0; i < 5000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('sheet metadata', () => {
  it('matches the Kenney Tiny Town packed sheet', () => {
    // The packed sheet is 192x176 = 12x11 tiles with no spacing. If this changes,
    // the spritesheet load parameters in MatchScene.preload must change too.
    expect(TURF_TILE_PX).toBe(16);
  });
});
