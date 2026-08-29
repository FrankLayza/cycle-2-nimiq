import { useEffect, useRef, useState } from 'react';
import { normalizeRoomCode } from '../net/client';
import { PixelIcon } from './PixelIcon';

interface Props {
  wallet: { address: string } | null;
  onConnectWallet: () => void;
  onPlay: () => void;
  onPvp: (code: string) => void;
  onToday: () => void;
  onCreateRoom: () => void;
  roomError?: string;
}

/**
 * Lobby — composed like the match screen: a dark surround with one bright square
 * field, so the menu echoes the screen the player actually plays on.
 *
 * Two earlier attempts were wrong in opposite directions. The first was a
 * marketing landing page — hero pitch, symmetric stat grid, CSS faux-3D snakes —
 * selling a product the player had already opened. The second tiled the Kenney
 * turf across the whole screen; at 2x the flower tile became a high-contrast dot
 * that made the 16px lattice unmistakable, so the entire lobby read as confetti
 * wallpaper, grey-on-green body text sat unreadable on top of it, and the content
 * overflowed a phone's 390px landscape height.
 *
 * The turf is now contained to a single arena-preview panel where it means
 * something, and the actions carry the screen.
 */
export function Lobby({ wallet, onConnectWallet, onPlay, onPvp, onToday, onCreateRoom, roomError }: Props) {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(normalizeRoomCode(params.get('room') ?? ''));
  const [open, setOpen] = useState(Boolean(params.get('room')));
  const [streak, setStreak] = useState<number | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) codeInputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    setStreak(null);
    if (!wallet) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/wallet/${wallet.address}`);
        if (!response.ok) return;
        const body = (await response.json()) as { profile?: { streak?: number } };
        if (!cancelled && body.profile) setStreak(body.profile.streak ?? 0);
      } catch {
        /* Keep the landing screen honest when the server is unavailable. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // Real data the lobby already fetched. It belongs on the mode it describes,
  // where it is a reason to tap, rather than buried in a footer line.
  const dailyDetail =
    !wallet || streak === null
      ? 'Daily seeded run'
      : streak === 0
        ? 'Daily seeded run · no streak yet'
        : `Daily seeded run · ${streak} day${streak === 1 ? '' : 's'}`;

  return (
    <main className="lobby-stage flex h-full min-h-0 w-full flex-col overflow-hidden bg-ink-deep px-5 pb-4 pt-5 text-cream @2xl:px-8 @4xl:px-12">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-teal bg-teal text-2xl font-black text-ink shadow-[0_4px_0_var(--color-teal-dark)]"
            style={{ textShadow: '0 1px 2px rgb(3 14 9 / 70%)' }}
            aria-hidden="true"
          >
            S
          </span>
          <span className="leading-tight">
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-teal">
              Nimiq Mini App
            </span>
            <span className="font-display block text-lg font-bold leading-none text-white">
              SNAKE RINK
            </span>
          </span>
        </div>

        {wallet ? (
          <span
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white"
            title={wallet.address}
          >
            <span className="h-2 w-2 rounded-full bg-teal" />
            <span className="tabular-nums">
              {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
            </span>
          </span>
        ) : (
          <button
            type="button"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black text-white transition-colors duration-150 hover:bg-white/20"
            onClick={onConnectWallet}
          >
            CONNECT WALLET
          </button>
        )}
      </header>

      <div className="lobby-content mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center">
        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-lemon">
            <span className="h-2 w-2 rounded-full bg-lemon" />
            Four seats. One rink.
          </div>
          <h2 className="font-display m-0 text-4xl font-bold leading-[0.9] text-white @2xl:text-6xl @4xl:text-7xl">
            GROW.<br />BOOST.<br /><span className="text-coral">OUTPLAY.</span>
          </h2>

          <button
            type="button"
            className="btn-3d btn-3d-coral min-h-16 w-full rounded-xl text-2xl font-bold @2xl:min-h-20 @2xl:text-3xl"
            onClick={onPlay}
          >
            PLAY
          </button>

          <div className="grid gap-2 @2xl:grid-cols-2">
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 p-3 text-left transition-colors duration-150 hover:border-teal/50 hover:bg-white/15"
              onClick={() => setOpen(true)}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal text-ink">
                <PixelIcon name="friends" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">PLAY WITH A FRIEND</span>
                <span className="block text-[10px] font-semibold text-white/60">
                  Room code · 2–4 players
                </span>
              </span>
            </button>

            <button
              type="button"
              className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 p-3 text-left transition-colors duration-150 hover:border-lemon/50 hover:bg-white/15"
              onClick={onToday}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lemon text-ink">
                <PixelIcon name="daily" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">TODAY&apos;S RUN</span>
                <span className="block text-[10px] font-semibold text-white/60">{dailyDetail}</span>
              </span>
            </button>
          </div>

          <p className="m-0 mx-auto max-w-md text-sm font-bold leading-relaxed text-white/60">
            A fast arena match where every turn closes the rink around you.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-2.5 text-[10px] font-bold text-white/40">
        <span>Rewards come from a team-seeded pool · the house never holds player funds</span>
        <span>Deterministic sim · replay-verified</span>
      </footer>

      {/* Room code. A dialog rather than an inline expander: on a phone's 390px
          landscape height an expanding panel pushed the page into a scroll. */}
      {open && (
        <div
          className="absolute inset-0 z-20 grid place-items-center bg-ink-deep/80 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Join a private room"
        >
          <div className="screen-enter w-full max-w-sm rounded-2xl border border-white/15 bg-ink p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-3">
              <h3 className="m-0 text-sm font-black text-white">Join a private room</h3>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-lg text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <PixelIcon name="close" size={14} />
              </button>
            </div>

            <form
              className="flex gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                if (code.length === 4) onPvp(code);
              }}
            >
              <input
                id="room-code"
                ref={codeInputRef}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^0-9A-HJ-KM-NP-TV-Z]/g, '')
                      .slice(0, 4)
                  )
                }
                maxLength={4}
                placeholder="ABCD"
                aria-label="Room code"
                autoComplete="off"
                spellCheck={false}
                className="h-12 min-w-0 flex-1 rounded-xl border-2 border-white/20 bg-ink-deep px-3 text-center text-xl font-black tracking-[0.35em] text-white outline-hidden transition-colors duration-150 placeholder:text-white/25 focus-visible:border-white/40"
              />
              <button
                type="submit"
                className="btn-3d btn-3d-teal h-12 shrink-0 rounded-xl px-5 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                disabled={code.length !== 4}
              >
                Join
              </button>
            </form>

            {/* Codes are Crockford base32, so I, L, O and U are excluded. The input
                strips them silently, which reads as a broken keyboard unless said. */}
            <p className="m-0 mt-2 text-[10px] font-semibold text-white/45">
              Four characters. No I, L, O or U — left out so codes cannot be misread.
            </p>

            <button
              type="button"
              className="mt-3 h-10 w-full rounded-xl border border-white/20 bg-white/10 text-xs font-black text-white transition-colors duration-150 hover:bg-white/20"
              onClick={onCreateRoom}
            >
              Create a room instead
            </button>

            {roomError && (
              <p
                className="m-0 mt-2.5 rounded-xl border border-coral-dark/30 bg-coral-deep/25 p-2.5 text-center text-[11px] font-bold text-coral-soft"
                role="alert"
              >
                {roomError}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
