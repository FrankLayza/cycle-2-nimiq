import type { Dir } from '@snake/sim';

export function portraitMode(): boolean {
  return window.matchMedia('(orientation: portrait)').matches;
}

/**
 * Convert a screen-space swipe vector to a game direction, compensating for the
 * CSS 90deg rotation of the landscape world inside the portrait container
 * (spike-proven mapping, 6/6 round-trip).
 */
export function swipeToDir(dx: number, dy: number): Dir {
  let gx: number;
  let gy: number;
  if (portraitMode()) {
    gx = dy;
    gy = -dx;
  } else {
    gx = dx;
    gy = dy;
  }
  if (Math.abs(gx) < Math.abs(gy)) return gy < 0 ? 'up' : 'down';
  return gx < 0 ? 'left' : 'right';
}
