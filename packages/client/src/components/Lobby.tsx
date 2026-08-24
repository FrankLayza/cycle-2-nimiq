import { useEffect, useRef, useState } from 'react';
import { normalizeRoomCode } from '../net/client';

interface Props {
  wallet: { address: string } | null;
  onConnectWallet: () => void;
  onPlay: () => void;
  onPvp: (code: string) => void;
  onToday: () => void;
  onCreateRoom: () => void;
  roomError?: string;
}

export function Lobby({ wallet, onConnectWallet, onPlay, onPvp, onToday, onCreateRoom, roomError }: Props) {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(normalizeRoomCode(params.get('room') ?? ''));
  const [open, setOpen] = useState(Boolean(params.get('room')));
  const [streak, setStreak] = useState<number | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      codeInputRef.current?.focus({ preventScroll: false });
      // Scroll into view on mobile if needed
      codeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
    return () => { cancelled = true; };
  }, [wallet]);

  return (
    <main className="lobby-shell mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 py-6 sm:py-8 lg:px-10 pb-16">
      {/* Top Header */}
      <header className="lobby-header flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="btn-3d btn-3d-teal h-12 w-12 rounded-2xl text-2xl font-black text-ink" aria-hidden="true">
            S
          </div>
          <div>
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.2em] text-grass-deep">Lawn League</p>
            <h1 className="m-0 text-xl font-black leading-tight tracking-tight text-ink">Competitive Snake</h1>
          </div>
        </div>
        {wallet ? (
          <div
            className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-xs font-bold text-ink shadow-xs"
            title={wallet.address}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-teal shadow-[0_0_8px_#35c982]" />
            <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
          </div>
        ) : (
          <button
            type="button"
            className="btn-3d btn-3d-white rounded-full px-5 py-2.5 text-xs font-black"
            onClick={onConnectWallet}
          >
            Connect Wallet
          </button>
        )}
      </header>

      {/* Hero Section with 2.5D Stadium Visual */}
      <section className="lobby-stage mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.85fr)] lg:items-center lg:gap-12">
        {/* 2.5D Lawn Arena Illustration */}
        <div className="lobby-visual-3d relative h-64 sm:h-80 lg:h-[27rem] w-full rounded-[2.25rem] p-6">
          <div className="lobby-sun-glow" aria-hidden="true" />
          <div className="pitch-rim-3d" aria-hidden="true" />

          {/* 3D Snakes & Pellets */}
          <div className="relative h-full w-full max-w-[480px] mx-auto">
            {/* Coral Snake */}
            <div className="character-snake-3d character-snake-coral-3d left-4 sm:left-10 bottom-8 sm:bottom-12 -rotate-6">
              <i /><i /><i /><i />
              <b>
                <span className="eye eye-left" />
                <span className="eye eye-right" />
              </b>
            </div>

            {/* Teal Snake */}
            <div className="character-snake-3d character-snake-teal-3d right-4 sm:right-10 top-6 sm:top-10 rotate-12 flex-row-reverse">
              <i /><i /><i />
              <b>
                <span className="eye eye-left" />
                <span className="eye eye-right" />
              </b>
            </div>

            {/* Floating 3D Golden Pellet */}
            <div className="floating-pickup-3d left-1/2 top-[46%]" aria-hidden="true" />
          </div>

          {/* 2.5D Visual Caption Badge */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
            <span className="rounded-full bg-ink/75 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white shadow-xs backdrop-blur-xs">
              ★ 1v1 Skill League ★
            </span>
          </div>
        </div>

        {/* Hero Text & Primary CTA */}
        <div className="lobby-hero text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-coral-soft/50 border border-coral-dark/20 px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-coral-deep">
            <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
            Live 60-second battles
          </div>
          <h2 className="mt-3 text-4xl font-black leading-[0.96] tracking-tight sm:text-5xl lg:text-6xl text-ink">
            Grow. Boost.<br />Outplay.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted font-medium">
            Fast-paced, server-verified snake battles where Nimiq wallet proves your skill and identity on-chain.
          </p>

          {/* 2.5D Stat Pillars */}
          <div className="mt-6 grid max-w-md grid-cols-3 gap-3 rounded-2xl border border-line bg-card/70 p-3.5 text-center shadow-xs backdrop-blur-xs">
            <div className="border-r border-line/80 pr-2">
              <b className="block text-xl font-black text-ink">1v1</b>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">Arcade Battle</span>
            </div>
            <div className="border-r border-line/80 pr-2">
              <b className="block text-xl font-black text-ink">60s</b>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">Match Speed</span>
            </div>
            <div>
              <b className="block text-xl font-black text-gold-deep">NIM</b>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">Proof of Skill</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 max-w-md">
            <button
              type="button"
              className="btn-3d btn-3d-coral min-h-16 w-full rounded-2xl text-2xl tracking-wide shadow-md"
              onClick={onPlay}
            >
              PLAY NOW
            </button>
            <p className="mt-1 text-center text-xs font-bold text-muted">
              Free play · Instant local bot match · No wallet required
            </p>
          </div>
        </div>
      </section>

      {/* Mode Selection Cards */}
      <section className="lobby-modes mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Play a friend */}
        <button
          type="button"
          className="card-2d flex min-h-28 items-center gap-4 p-5 text-left transition-transform"
          onClick={() => setOpen((prev) => !prev)}
        >
          <div className="btn-3d btn-3d-teal h-14 w-14 shrink-0 rounded-2xl text-2xl font-black text-ink">
            +
          </div>
          <div>
            <span className="block text-lg font-black text-ink">Play a Friend</span>
            <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-muted">
              Private 4-letter room code PvP
            </span>
          </div>
        </button>

        {/* Today's Run */}
        <button
          type="button"
          className="card-2d flex min-h-28 items-center gap-4 p-5 text-left transition-transform"
          onClick={onToday}
        >
          <div className="btn-3d btn-3d-lemon h-14 w-14 shrink-0 rounded-2xl text-2xl font-black text-ink">
            ★
          </div>
          <div>
            <span className="block text-lg font-black text-ink">Today&apos;s Run</span>
            <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-muted">
              Daily seeded solo challenge & streak
            </span>
          </div>
        </button>

        {/* League Promise */}
        <div className="card-2d-dark flex min-h-28 flex-col justify-center p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-teal shadow-[0_0_8px_#35c982]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-teal-soft">League Guarantee</span>
          </div>
          <span className="mt-2 block text-sm font-black leading-snug text-white">
            Pure skill. Deterministic sim. Verified replays & team-seeded rewards.
          </span>
        </div>
      </section>

      {/* Expandable 2.5D Room Code Form */}
      {open && (
        <section className="room-form screen-enter mt-4 max-w-2xl rounded-3xl border-2 border-teal/40 bg-card p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="m-0 text-base font-black text-ink flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-teal" />
              Private Room PvP
            </h3>
            <button
              type="button"
              className="text-xs font-bold text-muted hover:text-ink px-2 py-1"
              onClick={() => setOpen(false)}
            >
              Close ✕
            </button>
          </div>

          <form
            className="mt-4 flex flex-col sm:flex-row gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length === 4) onPvp(code);
            }}
          >
            <div className="relative flex-1">
              <input
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
                className="h-14 w-full rounded-2xl border-2 border-line bg-cream px-4 text-center text-2xl font-black tracking-[0.4em] text-ink outline-hidden focus:border-teal transition-colors shadow-inner"
              />
              <span className="pointer-events-none absolute left-3 top-1 text-[9px] font-black uppercase tracking-widest text-muted">
                Room Code
              </span>
            </div>

            <button
              type="submit"
              className="btn-3d btn-3d-teal h-14 px-8 rounded-2xl text-base font-black text-ink disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
              disabled={code.length !== 4}
            >
              Join Match
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-black uppercase tracking-wider text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            className="btn-3d btn-3d-white mt-3 h-12 w-full rounded-2xl text-sm font-black text-ink"
            onClick={onCreateRoom}
          >
            Create a New Room
          </button>

          {roomError && (
            <div className="mt-3 rounded-xl bg-coral-soft/50 border border-coral-dark/20 p-3 text-center text-xs font-bold text-coral-deep" role="alert">
              {roomError}
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="lobby-footer mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5 text-xs font-bold text-muted">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-grass" />
          <span>
            {!wallet
              ? 'Connect wallet to record daily streaks'
              : streak === null
                ? 'Play Today\'s Run to start your streak'
                : `🔥 ${streak} day${streak === 1 ? '' : 's'} streak active`}
          </span>
        </div>
        <span>Verified on-chain · No house betting</span>
      </footer>
    </main>
  );
}

