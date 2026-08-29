import Phaser from 'phaser';
import { MatchScene } from './MatchScene';
import { FIELD } from './theme';

/**
 * Creates the Phaser instance for a match field and keeps it sized to its host.
 *
 * Both the PvP match view and Today's Run previously built this inline, each
 * picking a fixed `720x1280` / `1280x720` canvas from a single
 * `window.innerHeight > window.innerWidth` check taken once at mount. That had
 * three consequences:
 *
 * - **Rotation did nothing.** The canvas kept its mount-time dimensions, so
 *   turning a phone left the field at the wrong aspect. There was never any
 *   orientation handling; `screen.orientation.lock()` is not viable here anyway
 *   (unsupported on iOS Safari and it requires fullscreen elsewhere), so the fix
 *   is to render correctly in *both* orientations rather than force one.
 * - **No device pixel ratio.** Phaser 3 has no DPR support of its own: in RESIZE
 *   mode it sets `canvas.width` straight from `getBoundingClientRect()`, i.e. CSS
 *   pixels, so on a retina screen the field was upscaled and soft.
 * - **A dead resize listener.** With no `scale` config the default mode is NONE,
 *   under which `this.scale.width` never changes, so `MatchScene`'s resize
 *   handler recomputed identical numbers forever.
 *
 * The fix keeps NONE mode but drives the size explicitly: the backing store is
 * sized in *device* pixels while CSS pins the canvas to 100% of its host box, so
 * the field renders at full device resolution. At zoom 1 Phaser leaves the inline
 * canvas style untouched (`ScaleManager.resize`), which is what lets CSS win.
 *
 * The scene works entirely in this device-pixel space and derives every dimension
 * from `cellPx`, so nothing needs to know the ratio.
 */

/**
 * Backing-store multiplier ceiling. 2x is the visible win; 3x quadruples the
 * fill cost for little further gain while the renderer is still immediate-mode
 * vector Graphics. Revisit once drawing moves to cached textures.
 */
const MAX_DPR = 2;

/** Marks the host so `index.css` can pin the canvas to the host box. */
const HOST_CLASS = 'match-canvas-host';

export interface ResponsiveGame {
  game: Phaser.Game;
  /** Tears down observers and destroys the game. */
  dispose: () => void;
}

interface Size {
  width: number;
  height: number;
}

function deviceRatio(): number {
  const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(Math.max(ratio, 1), MAX_DPR);
}

/** Host box in device pixels. Falls back through layout sources for hidden hosts. */
function measure(host: HTMLElement): Size {
  const rect = host.getBoundingClientRect();
  const cssWidth = rect.width || host.clientWidth || window.innerWidth;
  const cssHeight = rect.height || host.clientHeight || window.innerHeight;
  const dpr = deviceRatio();
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
  };
}

export function createMatchGame(host: HTMLElement): ResponsiveGame {
  host.classList.add(HOST_CLASS);
  const initial = measure(host);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    width: initial.width,
    height: initial.height,
    backgroundColor: FIELD.backdrop,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    // The field is pixel art (16px Kenney tiles), so it must be sampled
    // nearest-neighbour. `pixelArt` also enables roundPixels, keeping sprites off
    // half-pixel positions where they would shimmer while the snake interpolates.
    render: { pixelArt: true, powerPreference: 'high-performance' },
    scene: [MatchScene],
  });

  const sync = () => {
    if (!game.isBooted || !game.scale) return;
    const next = measure(host);
    if (game.scale.width === next.width && game.scale.height === next.height) return;
    game.scale.resize(next.width, next.height);
  };

  // ResizeObserver catches host-box changes from orientation, safe-area and
  // WebView chrome alike. The window listeners cover ratio changes that leave the
  // box identical (e.g. dragging across monitors of differing density).
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
  observer?.observe(host);
  window.addEventListener('orientationchange', sync);
  window.addEventListener('resize', sync);
  game.events.once('ready', sync);

  return {
    game,
    dispose: () => {
      observer?.disconnect();
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('resize', sync);
      host.classList.remove(HOST_CLASS);
      game.destroy(true);
    },
  };
}
