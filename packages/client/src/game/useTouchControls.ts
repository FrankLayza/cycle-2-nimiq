import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Dir } from '@snake/sim';
import { swipeToDir } from './input';
import { toStageDelta, toStagePoint, useStage } from '../shell/LandscapeStage';

/** Movement past this distance (CSS px) counts as a swipe rather than a hold. */
const SWIPE_THRESHOLD = 24;

/**
 * A press must dwell this long before it latches boost.
 *
 * Boosting is destructive — it burns a tail segment roughly every second
 * (`BOOST_TICKS`) — so a swipe that merely starts on the right must not trigger
 * it. Waiting briefly, and cancelling the moment the press turns into a swipe,
 * keeps steering and boosting from stealing each other's gestures.
 */
const HOLD_DELAY_MS = 120;

export interface TouchControlHandlers {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerCancel: (event: ReactPointerEvent) => void;
}

interface Options {
  enabled: boolean;
  onTurn: (dir: Dir) => void;
  onBoostChange: (boost: boolean) => void;
}

/**
 * Touch play for the arena: swipe anywhere to steer, press and hold the right
 * half to boost. Replaces the on-screen d-pad and boost button.
 *
 * All geometry is resolved in stage-local space, so "the right half" is the half
 * the player actually sees even while the shell is CSS-rotated to landscape.
 */
export function useTouchControls({ enabled, onTurn, onBoostChange }: Options): TouchControlHandlers {
  const geometry = useStage();
  const geometryRef = useRef(geometry);
  const turnRef = useRef(onTurn);
  const boostRef = useRef(onBoostChange);

  useEffect(() => {
    geometryRef.current = geometry;
    turnRef.current = onTurn;
    boostRef.current = onBoostChange;
  });

  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const boosting = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current === null) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);

  const releaseBoost = useCallback(() => {
    clearHold();
    if (!boosting.current) return;
    boosting.current = false;
    boostRef.current(false);
  }, [clearHold]);

  // Safety net: a pointer lost to a backgrounded tab, a system gesture or an
  // unmount must never leave boost latched on, since it keeps eating the tail.
  useEffect(() => {
    if (!enabled) {
      releaseBoost();
      return;
    }
    const release = () => releaseBoost();
    window.addEventListener('blur', release);
    window.addEventListener('pointercancel', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('blur', release);
      window.removeEventListener('pointercancel', release);
      document.removeEventListener('visibilitychange', release);
      release();
    };
  }, [enabled, releaseBoost]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (!enabled) return;
      // HUD controls live in the right rail, where a hold would otherwise latch
      // boost. Let interactive elements own their own gestures.
      if (event.target instanceof Element && event.target.closest('button, a, input, select')) return;
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      swiped.current = false;

      const local = toStagePoint(event.clientX, event.clientY, geometryRef.current);
      const stageWidth = geometryRef.current.width || 1;
      if (local.x < stageWidth / 2) return;

      clearHold();
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        // A swipe already claimed this gesture.
        if (swiped.current || !start.current) return;
        boosting.current = true;
        boostRef.current(true);
      }, HOLD_DELAY_MS);
    },
    [clearHold, enabled]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const from = start.current;
      if (!enabled || !from || from.id !== event.pointerId || swiped.current) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) + Math.abs(dy) <= SWIPE_THRESHOLD) return;

      // Steer as soon as the threshold is crossed rather than waiting for
      // release — at a 110ms tick, release-time steering feels a beat late.
      swiped.current = true;
      clearHold();
      const delta = toStageDelta(dx, dy, geometryRef.current);
      turnRef.current(swipeToDir(delta.dx, delta.dy, false));
    },
    [clearHold, enabled]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const from = start.current;
      start.current = null;
      releaseBoost();
      if (!enabled || !from || from.id !== event.pointerId || swiped.current) return;

      // Short flicks can outrun pointermove entirely; resolve them on release.
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) + Math.abs(dy) <= SWIPE_THRESHOLD) return;
      const delta = toStageDelta(dx, dy, geometryRef.current);
      turnRef.current(swipeToDir(delta.dx, delta.dy, false));
    },
    [enabled, releaseBoost]
  );

  const onPointerCancel = useCallback(() => {
    start.current = null;
    releaseBoost();
  }, [releaseBoost]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
