import { useEffect, useState } from 'react';
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
        /* server unreachable: footer stays quiet rather than inventing a streak */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  return (
    <main className="lobby-shell mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-6 sm:justify-center">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-grass text-xl shadow-sm" aria-hidden="true">S</div>
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Lawn League</p>
            <h1 className="m-0 text-lg font-black leading-tight tracking-tight">Competitive Snake</h1>
          </div>
        </div>
        {wallet ? (
          <div className="rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-muted" title={wallet.address}>
            Connected · {wallet.address.slice(0, 6)}…
          </div>
        ) : (
          <button className="min-h-11 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink" onClick={onConnectWallet}>
            Connect
          </button>
        )}
      </header>

      <section className="lobby-hero mt-8 rounded-3xl border border-line bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="lobby-character mx-auto mb-5 h-28 max-w-[220px] rounded-2xl bg-grass-soft p-4" aria-hidden="true">
          <div className="character-snake character-snake-coral"><i /><i /><i /><i /><b><span /><span /></b></div>
          <div className="character-snake character-snake-teal"><i /><i /><i /><b><span /><span /></b></div>
          <span className="pickup-mark" />
        </div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-coral-deep">Quick 1v1 battles</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Grow. Boost. Outplay.</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">Be the last snake standing in a fast, skill-first match.</p>
        <button className="button-primary control-button mt-6 min-h-14 w-full rounded-2xl border-none bg-coral px-6 text-xl font-black text-ink" onClick={onPlay}>
          PLAY NOW
        </button>
        <p className="mt-3 text-xs font-semibold text-muted">Free play · no wallet required</p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <button className="min-h-16 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-grass-soft" onClick={() => setOpen(true)}>
          <span className="block text-sm font-extrabold">Play a friend</span>
          <span className="mt-1 block text-xs leading-4 text-muted">Private room code</span>
        </button>
        <button className="min-h-16 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-lemon-soft" onClick={onToday}>
          <span className="block text-sm font-extrabold">Today&apos;s Run</span>
          <span className="mt-1 block text-xs leading-4 text-muted">Same field for everyone</span>
        </button>
      </section>

      {open && <section className="room-form screen-enter mt-3 rounded-2xl border border-line bg-card p-3 shadow-xs">
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (code.length === 4) onPvp(code); }}>
          <input autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^0-9A-HJ-KM-NP-TV-Z]/g, '').slice(0, 4))} maxLength={4} placeholder="ABCD" aria-label="Room code" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 text-center font-black tracking-[0.35em] outline-hidden" />
          <button className="min-h-11 rounded-xl bg-teal px-4 font-black text-ink shadow-sm disabled:opacity-45" type="submit" disabled={code.length !== 4}>Join</button>
        </form>
        <button className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-4 text-sm font-black text-ink" type="button" onClick={onCreateRoom}>
          Create a room
        </button>
        {roomError && <p className="m-0 mt-2 text-sm font-semibold text-coral-deep" role="alert">{roomError}</p>}
      </section>}

      <footer className="lobby-footer mt-5 flex items-center justify-between text-xs font-semibold text-muted">
        <span>{!wallet ? 'Connect to earn streaks' : streak === null ? 'Play Today’s Run to start a streak' : `${streak} day${streak === 1 ? '' : 's'} streak`}</span>
        <span>Verified scores · team-funded rewards</span>
      </footer>
    </main>
  );
}
