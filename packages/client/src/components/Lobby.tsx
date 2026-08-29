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
 * Lobby — the pitch at rest.
 *
 * This is a mini app launched from inside a wallet, not a website: the player has
 * already chosen to be here, so the screen's whole job is to start a match. The
 * previous version was shaped like a marketing landing page — a hero pitch, a
 * symmetric three-column stat grid ("1v1 / 60s / NIM"), and a "League Guarantee"
 * card — which sold a product the player had already bought, and whose "1v1"
 * claim had gone stale under D44's 2-4 player rooms.
 *
 * It also drew its own snakes in CSS, with gradient shading and highlighted eyes.
 * That was a third art language, and it contradicted the pixel field the player
 * saw two seconds later. The background is now the same Kenney turf as the match,
 * so the menu and the game are visibly one object.
 *
 * Structure follows the three things a player can actually do. Nothing else.
 */
export function Lobby({ wallet, onConnectWallet, onPlay, onPvp, onToday, onCreateRoom, roomError }: Props) {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(normalizeRoomCode(params.get('room') ?? ''));
  const [open, setOpen] = useState(Boolean(params.get('room')));
  const [streak, setStreak] = useState<number | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    codeInputRef.current?.focus({ preventScroll: false });
    codeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  // Streak is real data the lobby already fetched but used to bury in the footer.
  // It belongs on the mode it describes, where it is a reason to tap.
  const dailyDetail = !wallet
    ? 'Daily seeded solo run · connect to record a streak'
    : streak === null
      ? 'Daily seeded solo run · start your streak'
      : streak === 0
        ? 'Daily seeded solo run · no streak yet'
        : `Daily seeded solo run · ${streak} day${streak === 1 ? '' : 's'} running`;

  return (
    <main className="turf-surface flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="turf-scrim" aria-hidden="true" />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-10">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink/15 bg-card text-base font-black text-ink shadow-xs"
              aria-hidden="true"
            >
              S
            </div>
            <div className="leading-tight">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-grass-deep">
                Nimiq Mini App
              </p>
              <h1 className="m-0 text-base font-black tracking-tight text-ink sm:text-lg">Competitive Snake</h1>
            </div>
          </div>

          {wallet ? (
            <div
              className="flex items-center gap-2 rounded-full border border-line bg-card/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-xs"
              title={wallet.address}
            >
              <span className="h-2 w-2 rounded-full bg-teal" />
              <span className="tabular-nums">
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="btn-3d btn-3d-white rounded-full px-4 py-2 text-[11px] font-black"
              onClick={onConnectWallet}
            >
              Connect Wallet
            </button>
          )}
        </header>

        {/* Body: the ask on the left, the alternatives on the right. Landscape-first,
            because the shell presents landscape on touch devices. */}
        <div className="grid min-h-0 flex-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-10">
          <section>
            <h2 className="m-0 text-[1.75rem] font-black leading-[0.95] tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Up to four snakes,
              <br />
              one shrinking arena.
            </h2>
            <p className="mt-2.5 max-w-sm text-sm font-medium leading-relaxed text-ink/70 sm:text-base">
              Every match runs on a shared seed, so the arena is identical for all players and the
              result can be replayed and checked.
            </p>

            <button
              type="button"
              className="btn-3d btn-3d-coral mt-4 min-h-14 w-full max-w-sm rounded-2xl text-xl tracking-wide shadow-md sm:min-h-16 sm:text-2xl"
              onClick={onPlay}
            >
              Quick Match
            </button>
            <p className="mt-2 max-w-sm text-center text-[11px] font-bold text-ink/60">
              Against a bot · starts immediately · no wallet needed
            </p>
          </section>

          {/* The other two modes. Two rows, because there are two — not a
              symmetric grid padded out to look balanced. */}
          <section className="flex shrink-0 flex-col gap-2.5">
            <button
              type="button"
              className="card-2d flex items-center gap-3.5 p-4 text-left"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal text-ink shadow-xs">
                <PixelIcon name="friends" size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black text-ink">Play a Friend</span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-muted">
                  Private room code · 2–4 players
                </span>
              </span>
            </button>

            <button type="button" className="card-2d flex items-center gap-3.5 p-4 text-left" onClick={onToday}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lemon text-ink shadow-xs">
                <PixelIcon name="daily" size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black text-ink">Today&apos;s Run</span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-muted">
                  {dailyDetail}
                </span>
              </span>
            </button>

            {open && (
              <div className="room-form screen-enter rounded-2xl border-2 border-teal/40 bg-card p-4 shadow-lg">
                <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
                  <h3 className="m-0 text-sm font-black text-ink">Join a private room</h3>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-cream-deep hover:text-ink"
                    onClick={() => setOpen(false)}
                    aria-label="Close room code form"
                  >
                    <PixelIcon name="close" size={14} />
                  </button>
                </div>

                <form
                  className="mt-3 flex flex-col gap-2.5 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (code.length === 4) onPvp(code);
                  }}
                >
                  <div className="flex-1">
                    <label
                      className="block text-[9px] font-black uppercase tracking-widest text-muted"
                      htmlFor="room-code"
                    >
                      Room code
                    </label>
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
                      autoComplete="off"
                      spellCheck={false}
                      inputMode="text"
                      className="mt-1 h-12 w-full rounded-xl border-2 border-line bg-cream px-3 text-center text-xl font-black tracking-[0.4em] text-ink shadow-inner outline-hidden transition-colors duration-150 focus:border-teal"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-3d btn-3d-teal mt-auto h-12 shrink-0 rounded-xl px-6 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                    disabled={code.length !== 4}
                  >
                    Join
                  </button>
                </form>

                {/* Codes are Crockford base32, so I, L, O and U are excluded. The
                    input silently strips them, which reads as a broken keyboard
                    unless it is said out loud. */}
                <p className="mt-2 text-[10px] font-semibold text-muted">
                  Four characters. No I, L, O or U — they are left out so codes cannot be misread.
                </p>

                <button
                  type="button"
                  className="btn-3d btn-3d-white mt-3 h-11 w-full rounded-xl text-xs font-black text-ink"
                  onClick={onCreateRoom}
                >
                  Create a room instead
                </button>

                {roomError && (
                  <p
                    className="m-0 mt-2.5 rounded-xl border border-coral-dark/20 bg-coral-soft/50 p-2.5 text-center text-[11px] font-bold text-coral-deep"
                    role="alert"
                  >
                    {roomError}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-ink/10 pt-2.5 text-[10px] font-bold text-ink/60">
          <span className="flex items-center gap-1.5">
            {wallet && streak !== null && streak > 0 && (
              <PixelIcon name="streak" size={12} className="text-grass-deep" />
            )}
            <span>Rewards come from a team-seeded pool · the house never holds player funds</span>
          </span>
          <span>Deterministic sim · replay-verified</span>
        </footer>
      </div>
    </main>
  );
}
