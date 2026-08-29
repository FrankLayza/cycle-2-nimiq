import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Presents the app in landscape, even on a portrait device.
 *
 * `screen.orientation.lock()` cannot carry this on its own: it is unimplemented
 * in iOS Safari and requires fullscreen almost everywhere else, so it will not
 * work inside the Nimiq Pay WebView. It is still attempted opportunistically —
 * when the platform honours it the device really rotates and the CSS fallback
 * becomes a no-op. Otherwise the stage is laid out at swapped dimensions and
 * rotated 90deg with a CSS transform.
 *
 * That rotation is what the codebase was always designed around: `swipeToDir`
 * already carried the matching inverse mapping, commented as "compensating for
 * the CSS 90deg rotation of the landscape world inside the portrait container".
 * The rotation itself had never been implemented, so the compensation was being
 * applied against an unrotated field and a rightward swipe steered the snake
 * upward. Implementing the rotation is what makes that mapping correct.
 *
 * Rotation is gated on a coarse pointer so a narrow desktop window is never
 * turned on its side.
 */

export interface StageGeometry {
  /** True when the shell is CSS-rotated to present landscape on a portrait device. */
  rotated: boolean;
  /** Stage width in CSS px, after any rotation. */
  width: number;
  /** Stage height in CSS px, after any rotation. */
  height: number;
  /** Untransformed viewport width — needed to invert the rotation for pointer maths. */
  viewportWidth: number;
}

const FALLBACK: StageGeometry = { rotated: false, width: 0, height: 0, viewportWidth: 0 };
const StageContext = createContext<StageGeometry>(FALLBACK);

/** Stage geometry for pointer mapping. Safe to call outside a provider. */
export function useStage(): StageGeometry {
  return useContext(StageContext);
}

/**
 * Map a client-space point into stage-local space.
 *
 * The rotated stage is laid out at `viewportHeight x viewportWidth` and then
 * transformed with `rotate(90deg) translateY(-100%)` about its top-left corner,
 * which sends a local point `(x, y)` to `(viewportWidth - y, x)` on screen.
 * Inverting that gives the mapping below.
 */
export function toStagePoint(clientX: number, clientY: number, geometry: StageGeometry): { x: number; y: number } {
  if (!geometry.rotated) return { x: clientX, y: clientY };
  return { x: clientY, y: geometry.viewportWidth - clientX };
}

/** Map a client-space movement delta into stage-local space. */
export function toStageDelta(dx: number, dy: number, geometry: StageGeometry): { dx: number; dy: number } {
  if (!geometry.rotated) return { dx, dy };
  return { dx: dy, dy: -dx };
}

function measure(): StageGeometry {
  if (typeof window === 'undefined') return FALLBACK;
  const rotated = window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
  return {
    rotated,
    width: rotated ? window.innerHeight : window.innerWidth,
    height: rotated ? window.innerWidth : window.innerHeight,
    viewportWidth: window.innerWidth,
  };
}

interface OrientationLock {
  lock?: (orientation: string) => Promise<void>;
}

/**
 * Ask the platform for real landscape. Rejects on most targets (needs fullscreen,
 * or is simply unimplemented), which is expected — the CSS rotation is the actual
 * mechanism and this is only an upgrade where it is allowed.
 */
function requestNativeLandscape(): void {
  if (typeof screen === 'undefined') return;
  const orientation = (screen as Screen & { orientation?: OrientationLock }).orientation;
  if (!orientation || typeof orientation.lock !== 'function') return;
  try {
    void orientation.lock('landscape')?.catch(() => {});
  } catch {
    /* unsupported — CSS rotation handles it */
  }
}

export function LandscapeStage({ children }: { children: ReactNode }) {
  const [geometry, setGeometry] = useState<StageGeometry>(measure);

  useEffect(() => {
    requestNativeLandscape();
    const update = () => setGeometry(measure());
    // Re-measure on mount: the viewport can settle between first render and here.
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Sized inline rather than with vh/vw units, which are unreliable on mobile
  // while browser chrome shows and hides. Only pinned when rotated; unrotated the
  // stage should track the viewport via CSS `inset: 0`.
  const style = geometry.rotated ? { width: geometry.width, height: geometry.height } : undefined;

  return (
    <StageContext.Provider value={geometry}>
      <div
        className={`landscape-stage${geometry.rotated ? ' landscape-stage-rotated' : ''}`}
        // Layout must respond to the STAGE, not the viewport. Under rotation a
        // phone reports a 390px-wide viewport while the stage is 844px wide, so
        // viewport media queries and Tailwind's `sm:`/`lg:` breakpoints all take
        // the narrow branch on a wide stage. `.landscape-stage` is a query
        // container (see index.css) so Tailwind's `@` container variants work,
        // and this attribute carries the one thing a width query cannot express:
        // whether the stage is wider than it is tall.
        data-orientation={geometry.width >= geometry.height ? 'landscape' : 'portrait'}
        style={style}
      >
        {children}
      </div>
    </StageContext.Provider>
  );
}
