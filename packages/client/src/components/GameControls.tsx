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
 * Shared 2.5D tactile D-pad + boost vocabulary for every game surface (MatchView,
 * TodayRunView). Renders a fragment so each view owns its layout.
 */
export function GameControls({
  variant = 'light',
  disabled = false,
  boosting = false,
  onTurn,
  onBoostChange,
  trailing,
}: GameControlsProps) {
  const padSkin =
    variant === 'light'
      ? 'border-white/85 bg-white/90 shadow-md'
      : 'border-white/20 bg-ink/75 shadow-lg';

  const keySkin =
    variant === 'light'
      ? 'dpad-key bg-linear-to-b from-white to-cream border border-line text-ink'
      : 'dpad-key dpad-key-dark bg-linear-to-b from-slate-700 to-slate-800 border border-white/20 text-white';

  return (
    <>
      <div
        className={`game-pad grid grid-cols-3 grid-rows-3 gap-1.5 rounded-[1.5rem] border p-2 backdrop-blur-md ${padSkin}`}
      >
        {TURNS.map(([dir, label, position]) => (
          <button
            key={dir}
            type="button"
            className={`${position} ${keySkin} h-12 w-12 rounded-xl text-lg font-black disabled:opacity-40 disabled:cursor-not-allowed select-none touch-none`}
            disabled={disabled}
            aria-label={`Turn ${dir}`}
            onPointerDown={(e) => {
              e.preventDefault();
              onTurn(dir);
            }}
          >
            <span aria-hidden="true" className="drop-shadow-xs">{label}</span>
          </button>
        ))}
      </div>

      {trailing ?? (
        <button
          type="button"
          className={`boost-button btn-3d grid h-24 w-24 place-items-center rounded-[1.6rem] border-4 border-white/90 text-sm font-black text-ink select-none touch-none disabled:opacity-40 disabled:cursor-not-allowed ${
            boosting ? 'is-boosting ring-4 ring-lemon/50' : ''
          }`}
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            onBoostChange(true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onBoostChange(false);
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            onBoostChange(false);
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            onBoostChange(false);
          }}
          onBlur={() => onBoostChange(false)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="flex flex-col items-center">
            <span className="block text-lg font-black leading-none tracking-wider">BOOST</span>
            <span className="mt-1 block text-[9px] font-black uppercase tracking-widest text-ink/75 bg-lemon-dark/30 px-2 py-0.5 rounded-full">
              {boosting ? 'BURNING' : 'HOLD'}
            </span>
          </span>
        </button>
      )}
    </>
  );
}
