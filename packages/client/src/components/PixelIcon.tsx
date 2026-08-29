interface Props {
  name: IconName;
  /** Rendered size in px. Match it to the text it sits beside. */
  size?: number;
  className?: string;
}

export type IconName = 'friends' | 'daily' | 'close' | 'win' | 'loss' | 'draw' | 'streak';

/** [x, y, width, height] on a 16x16 grid. */
type Rect = readonly [number, number, number, number];

/**
 * Icons drawn as rectangles on the same 16x16 lattice as the Kenney tiles.
 *
 * Rects only, no curves, `shape-rendering: crispEdges` — so icons share the
 * field's geometry rather than importing a smooth vector icon set that would sit
 * at odds with the pixel art. It also avoids a runtime dependency, which matters
 * for a mini app's bundle, and replaces the platform emoji that previously stood
 * in as icons (those render differently on every OS and undercut custom art).
 */
const ICONS: Record<IconName, readonly Rect[]> = {
  // Two offset blocks — two players.
  friends: [
    [1, 5, 6, 6],
    [9, 3, 6, 6],
  ],
  // A framed field with a single seeded cell at its centre.
  daily: [
    [2, 3, 12, 2],
    [2, 12, 12, 2],
    [2, 3, 2, 11],
    [12, 3, 2, 11],
    [7, 7, 3, 3],
  ],
  close: [
    [3, 3, 2, 2],
    [5, 5, 2, 2],
    [7, 7, 2, 2],
    [9, 9, 2, 2],
    [11, 11, 2, 2],
    [11, 3, 2, 2],
    [9, 5, 2, 2],
    [5, 9, 2, 2],
    [3, 11, 2, 2],
  ],
  // Arrow up.
  win: [
    [7, 3, 2, 2],
    [5, 5, 2, 2],
    [9, 5, 2, 2],
    [3, 7, 2, 2],
    [11, 7, 2, 2],
    [7, 5, 2, 8],
  ],
  // Arrow down.
  loss: [
    [7, 11, 2, 2],
    [5, 9, 2, 2],
    [9, 9, 2, 2],
    [3, 7, 2, 2],
    [11, 7, 2, 2],
    [7, 3, 2, 8],
  ],
  // Two level bars.
  draw: [
    [3, 6, 10, 2],
    [3, 9, 10, 2],
  ],
  // A rising step chart — days stacked.
  streak: [
    [2, 10, 3, 4],
    [6, 7, 3, 7],
    [10, 4, 3, 10],
  ],
};

export function PixelIcon({ name, size = 16, className }: Props) {
  return (
    <svg
      className={className ? `pixel-icon ${className}` : 'pixel-icon'}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map(([x, y, width, height]) => (
        <rect key={`${x}-${y}-${width}-${height}`} x={x} y={y} width={width} height={height} />
      ))}
    </svg>
  );
}
