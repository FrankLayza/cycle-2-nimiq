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
      ? 'border-white/80 bg-white/88 [&>button]:border-line [&>button]:bg-card [&>button]:text-ink'
      : 'border-white/35 bg-ink/45 [&>button]:border-white/25 [&>button]:bg-white/12 [&>button]:text-white active:[&>button]:bg-white/22';

  return (
    <>
      <div className={`game-pad grid grid-cols-3 grid-rows-3 gap-1 rounded-[1.35rem] border p-2 shadow-xs backdrop-blur-xs ${padSkin}`}>
        {TURNS.map(([dir, label, position]) => (
          <button
            key={dir}
            type="button"
            className={`control-button ${position} min-h-11 min-w-11 rounded-xl border text-lg font-black shadow-xs disabled:opacity-45`}
            disabled={disabled}
            aria-label={`Turn ${dir}`}
            onPointerDown={() => onTurn(dir)}
          >
            <span aria-hidden="true">{label}</span>
          </button>
        ))}
      </div>
      {trailing ?? (
        <button
          type="button"
          className={`boost-button control-button grid h-24 w-24 place-items-center rounded-[1.35rem] border-4 border-white/80 bg-lemon text-sm font-black text-ink shadow-[0_5px_0_#d6be28] disabled:opacity-45 ${boosting ? 'is-boosting' : ''}`}
          disabled={disabled}
          onPointerDown={() => onBoostChange(true)}
          onPointerUp={() => onBoostChange(false)}
          onPointerCancel={() => onBoostChange(false)}
          onPointerLeave={() => onBoostChange(false)}
          onBlur={() => onBoostChange(false)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span><span className="block text-base leading-none">BOOST</span><span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.12em] opacity-70">Hold</span></span>
        </button>
      )}
    </>
  );
}
