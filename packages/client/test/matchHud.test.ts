import { describe, expect, it } from 'vitest';
import { MIN_BOUND, SHRINK_EVERY, TICK_MS } from '@snake/sim';
import {
  formatMatchClock,
  isStillShrinking,
  shrinkSecondsRemaining,
  ticksUntilShrink,
} from '../src/game/matchHud';

describe('shrink countdown', () => {
  it('counts down a full period and rolls over at the contraction', () => {
    expect(ticksUntilShrink(0)).toBe(SHRINK_EVERY);
    expect(ticksUntilShrink(1)).toBe(SHRINK_EVERY - 1);
    expect(ticksUntilShrink(SHRINK_EVERY - 1)).toBe(1);
    // The tick the boundary actually moves restarts the period rather than
    // reading zero.
    expect(ticksUntilShrink(SHRINK_EVERY)).toBe(SHRINK_EVERY);
    expect(ticksUntilShrink(SHRINK_EVERY * 3 + 4)).toBe(SHRINK_EVERY - 4);
  });

  it('tracks the real 11s period, not the 10s the HUD used to assume', () => {
    // SHRINK_EVERY ticks x TICK_MS is 11_000ms — the old `10 - (elapsed % 10)`
    // was a 10s timer on an 11s event, so it drifted a second every cycle.
    expect((SHRINK_EVERY * TICK_MS) / 1000).toBe(11);
    expect(shrinkSecondsRemaining(0)).toBe(11);

    // The regression: at the exact tick of the first contraction the old formula
    // produced 9. It must read a fresh full period instead.
    expect(shrinkSecondsRemaining(SHRINK_EVERY)).toBe(11);
    const oldFormula = (tick: number) => Math.max(0, 10 - (Math.floor((tick * TICK_MS) / 1000) % 10));
    expect(oldFormula(SHRINK_EVERY)).toBe(9);
  });

  it('never reports zero, so the HUD cannot sit on a stalled countdown', () => {
    for (let tick = 0; tick < SHRINK_EVERY * 4; tick++) {
      const seconds = shrinkSecondsRemaining(tick);
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(11);
    }
  });
});

describe('shrink availability', () => {
  it('stops promising a contraction once the arena bottoms out', () => {
    expect(isStillShrinking(30)).toBe(true);
    expect(isStillShrinking(MIN_BOUND + 2)).toBe(true);
    expect(isStillShrinking(MIN_BOUND)).toBe(false);
    expect(isStillShrinking(MIN_BOUND - 1)).toBe(false);
  });
});

describe('match clock', () => {
  it('formats elapsed ticks as m:ss', () => {
    expect(formatMatchClock(0)).toBe('0:00');
    // Ticks are 110ms, so a whole second needs the first tick at or past 1000ms.
    expect(formatMatchClock(Math.ceil(1000 / TICK_MS))).toBe('0:01');
    expect(formatMatchClock(Math.ceil(65_000 / TICK_MS))).toBe('1:05');
  });

  it('floors partial seconds rather than rounding up', () => {
    // 9 ticks is 990ms — still second zero.
    expect(formatMatchClock(9)).toBe('0:00');
    expect(formatMatchClock(10)).toBe('0:01');
  });
});
