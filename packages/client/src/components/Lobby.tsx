import { useState } from 'react';
import { normalizeRoomCode } from '../net/client';

interface Props {
  wallet: { address: string } | null;
  onConnectWallet: () => void;
  onPlay: () => void;
  onPvp: (code: string) => void;
  onToday: () => void;
}

export function Lobby({ wallet, onConnectWallet, onPlay, onPvp, onToday }: Props) {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(normalizeRoomCode(params.get('room') ?? ''));
  const [open, setOpen] = useState(Boolean(params.get('room')));

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-6 sm:justify-center">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-grass text-xl shadow-sm" aria-hidden="true">S</div>
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-muted">Lawn League</p>
            <h1 className="m-0 text-lg font-black tracking-tight">Competitive Snake</h1>
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
        <div className="mx-auto mb-5 flex h-28 max-w-[220px] items-end justify-center gap-2 rounded-2xl bg-grass-soft p-4" aria-hidden="true">
          <span className="snake-mark snake-mark-coral" />
          <span className="snake-mark snake-mark-teal" />
          <span className="pickup-mark" />
        </div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-coral">Quick 1v1 battles</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Grow. Boost. Outplay.</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">Be the last snake standing in a fast, skill-first match.</p>
        <button className="mt-6 min-h-14 w-full rounded-2xl border-none bg-coral px-6 text-xl font-black text-white shadow-[0_5px_0_var(--color-coral-dark)] transition-transform active:translate-y-1 active:shadow-none" onClick={onPlay}>
          PLAY NOW
        </button>
        <p className="mt-3 text-xs font-semibold text-muted">Free play · no wallet required</p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <button className="min-h-14 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-grass-soft" onClick={() => setOpen(true)}>
          <span className="block text-sm font-bold">Play a friend</span>
          <span className="mt-1 block text-xs text-muted">Private room code</span>
        </button>
        <button className="min-h-14 rounded-2xl border border-line bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-lemon-soft" onClick={onToday}>
          <span className="block text-sm font-bold">Today&apos;s Run</span>
          <span className="mt-1 block text-xs text-muted">Same field for everyone</span>
        </button>
      </section>

      {open && <form className="mt-3 flex gap-2 rounded-2xl border border-line bg-card p-3 shadow-xs" onSubmit={(event) => { event.preventDefault(); if (code.length === 4) onPvp(code); }}>
        <input autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^0-9A-HJ-KM-NP-TV-Z]/g, '').slice(0, 4))} maxLength={4} placeholder="ABCD" aria-label="Room code" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 text-center font-black tracking-[0.35em] outline-hidden" />
        <button className="min-h-11 rounded-xl bg-teal px-4 font-bold text-ink disabled:opacity-45" type="submit" disabled={code.length !== 4}>Join</button>
      </form>}

      <footer className="mt-5 flex items-center justify-between text-xs font-semibold text-muted">
        <span>0 day streak</span>
        <span>Verified scores · team-funded rewards</span>
      </footer>
    </main>
  );
}
