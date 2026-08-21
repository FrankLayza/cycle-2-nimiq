import type { ReactNode } from 'react';
import type { Dir } from '@snake/sim';

const TURNS: Array<[Dir, string, string]> = [
  ['up', '▲', 'col-start-2 row-start-1'],
  ['left', '◀', 'col-start-1 row-start-2'],
  ['down', '▼', 'col-start-2 row-start-3'],
  ['right', '▶', 'col-start-3 row-start-2'],
];

interface GameControlsProps {
  variant?: 'light' | 'dark';
  disabled?: boolean;
  boosting?: boolean;
  onTurn: (dir: Dir) => void;
  onBoostChange: (boost: boolean) => void;
  /** Replaces the BOOST button (e.g. Today's Run verify CTA). */
  trailing?: ReactNode;
}

/**
 * Shared d-pad + boost vocabulary for every game surface (MatchView,
 * TodayRunView). Renders a fragment so each view owns its layout.
 */
export function GameControls({ variant = 'light', disabled = false, boosting = false, onTurn, onBoostChange, trailing }: GameControlsProps) {
  const padSkin =
    variant === 'light'
      ? 'border-white/75 bg-white/88 [&>button]:border-line [&>button]:bg-card [&>button]:text-ink'
      : 'border-white/20 bg-white/10 [&>button]:border-white/25 [&>button]:bg-ink/20 [&>button]:text-white active:[&>button]:bg-ink/35';

  return (
    <>
      <div className={`game-pad grid grid-cols-3 grid-rows-3 gap-1 rounded-2xl border p-2 backdrop-blur-xs ${padSkin}`}>
        {TURNS.map(([dir, label, position]) => (
          <button
            key={dir}
            type="button"
            className={`control-button ${position} min-h-11 min-w-11 rounded-xl border text-lg shadow-xs disabled:opacity-45`}
            disabled={disabled}
            aria-label={`Turn ${dir}`}
            onPointerDown={() => onTurn(dir)}
          >
            {label}
          </button>
        ))}
      </div>
      {trailing ?? (
        <button
          type="button"
          className={`boost-button control-button h-24 w-24 rounded-2xl border-4 border-white/80 bg-lemon text-sm font-black text-ink shadow-[0_5px_0_#d6be28] disabled:opacity-45 ${boosting ? 'is-boosting' : ''}`}
          disabled={disabled}
          onPointerDown={() => onBoostChange(true)}
          onPointerUp={() => onBoostChange(false)}
          onPointerCancel={() => onBoostChange(false)}
          onPointerLeave={() => onBoostChange(false)}
          onBlur={() => onBoostChange(false)}
          onContextMenu={(event) => event.preventDefault()}
        >
          BOOST
        </button>
      )}
    </>
  );
}
