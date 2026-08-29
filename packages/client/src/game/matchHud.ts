import { MIN_BOUND, SHRINK_EVERY, TICK_MS } from '@snake/sim';

/**
 * Pure derivations for the match HUD.
 *
 * Kept out of the component so the arithmetic is unit-testable: the shrink
 * countdown was previously `10 - (elapsedSeconds % 10)`, a 10-second timer on an
 * event that fires every `SHRINK_EVERY * TICK_MS` (100 ticks x 110ms = 11s). It
 * drifted a second every cycle and displayed "9" at the exact tick the boundary
 * contracted.
 */

/** Ticks remaining until the next boundary contraction. */
export function ticksUntilShrink(tick: number): number {
  const phase = ((tick % SHRINK_EVERY) + SHRINK_EVERY) % SHRINK_EVERY;
  return SHRINK_EVERY - phase;
}

/**
 * Whole seconds until the next contraction, as shown in the HUD. Counts down to
 * 1 and then rolls over — it never displays 0, because the tick that would read
 * zero is the tick the boundary has already moved on.
 */
export function shrinkSecondsRemaining(tick: number): number {
  return Math.ceil((ticksUntilShrink(tick) * TICK_MS) / 1000);
}

/**
 * Whether the boundary can still contract. The sim stops at `MIN_BOUND`, past
 * which a countdown would be promising something that never happens.
 */
export function isStillShrinking(boundary: number): boolean {
  return boundary > MIN_BOUND;
}

/** Elapsed match time as `m:ss`. */
export function formatMatchClock(tick: number): string {
  const seconds = Math.floor((tick * TICK_MS) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
