import { useEffect, useRef } from 'react';
import type { Dir } from '@snake/sim';

const KEY_TURNS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

/**
 * Desktop keyboard play (PRODUCT.md requirement): Arrows/WASD turn,
 * holding Space boosts. Mirrors the on-screen d-pad exactly.
 */
export function useKeyboardControls(
  enabled: boolean,
  onTurn: (dir: Dir) => void,
  onBoostChange: (boost: boolean) => void,
): void {
  const turnRef = useRef(onTurn);
  const boostRef = useRef(onBoostChange);
  useEffect(() => {
    turnRef.current = onTurn;
    boostRef.current = onBoostChange;
  });

  useEffect(() => {
    if (!enabled) return;
    const down = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const dir = KEY_TURNS[event.key];
      if (dir) {
        event.preventDefault();
        if (!event.repeat) turnRef.current(dir);
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) boostRef.current(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        boostRef.current(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      boostRef.current(false);
    };
  }, [enabled]);
}
