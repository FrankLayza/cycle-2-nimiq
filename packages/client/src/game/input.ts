import type { Dir } from '@snake/sim';

export function portraitMode(): boolean {
  return window.matchMedia('(orientation: portrait)').matches;
}

/**
 * Convert a swipe vector to a game direction.
 *
 * `rotated` compensates for the CSS 90deg rotation the shell applies to present
 * landscape on a portrait device (spike-proven mapping, 6/6 round-trip). Callers
 * that have already mapped the delta into stage-local space — `useTouchControls`
 * does, via `toStageDelta` — must pass `false` so the rotation is not applied
 * twice. The default preserves the original behaviour for direct callers.
 */
export function swipeToDir(dx: number, dy: number, rotated: boolean = portraitMode()): Dir {
  const gx = rotated ? dy : dx;
  const gy = rotated ? -dx : dy;
  if (Math.abs(gx) < Math.abs(gy)) return gy < 0 ? 'up' : 'down';
  return gx < 0 ? 'left' : 'right';
}
