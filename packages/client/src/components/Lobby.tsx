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
    return () => { cancelled = true; };
  }, [wallet]);

  return (
    <main className="lobby-shell mx-auto flex min-h-full w-full max-w-6xl flex-col overflow-y-auto px-5 py-6 lg:px-10">
      <header className="lobby-header flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-grass text-xl font-black text-ink shadow-xs" aria-hidden="true">S</div>
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Lawn League</p>
            <h1 className="m-0 text-lg font-black leading-tight tracking-tight">Competitive Snake</h1>
          </div>
        </div>
        {wallet ? (
          <div className="rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-muted" title={wallet.address}>
            Connected - {wallet.address.slice(0, 6)}...
          </div>
        ) : (
          <button className="min-h-11 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink" onClick={onConnectWallet}>Connect</button>
        )}
      </header>

      <section className="lobby-stage mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,.78fr)] lg:items-center lg:gap-12">
        <div className="lobby-visual relative h-[13rem] overflow-hidden rounded-[2rem] border border-white/70 bg-grass-soft p-5 shadow-xs sm:h-80 lg:h-[26rem]">
          <div className="lobby-sun" aria-hidden="true" />
          <div className="lobby-field-lines" aria-hidden="true" />
          <div className="lobby-character lobby-character-large mx-auto h-full max-w-[520px]" aria-hidden="true">
            <div className="character-snake character-snake-coral"><i /><i /><i /><i /><b><span /><span /></b></div>
            <div className="character-snake character-snake-teal"><i /><i /><i /><b><span /><span /></b></div>
            <span className="pickup-mark" />
          </div>
          <div className="lobby-visual-caption"><span className="snake-mark snake-mark-coral" /><span>1v1 lawn league</span><span className="snake-mark snake-mark-teal" /></div>
        </div>

        <div className="lobby-hero text-left">
          <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-coral-deep">Quick 1v1 battles</p>
          <h2 className="mt-2 max-w-xl text-4xl font-black leading-[.98] tracking-tight sm:text-5xl lg:text-6xl">Grow. Boost. Outplay.</h2>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">A bright, skill-first snake match built for quick rematches and friendly rivalry.</p>
          <div className="mt-6 grid max-w-md grid-cols-3 gap-2 border-y border-line py-4 text-center">
            <div><b className="block text-lg font-black">1v1</b><span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">battle</span></div>
            <div><b className="block text-lg font-black">60s</b><span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">matches</span></div>
            <div><b className="block text-lg font-black">NIM</b><span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">rewards</span></div>
          </div>
          <button className="button-primary control-button mt-6 min-h-14 w-full max-w-md rounded-2xl border-none bg-coral px-6 text-xl font-black text-ink" onClick={onPlay}>PLAY NOW</button>
          <p className="mt-3 text-xs font-semibold text-muted">Free play - no wallet required</p>
        </div>
      </section>

      <section className="lobby-modes mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button className="lobby-mode lobby-mode-friend flex min-h-24 items-center gap-3 rounded-2xl border border-line bg-card px-5 py-4 text-left shadow-xs transition-colors hover:bg-grass-soft" onClick={() => setOpen(true)}>
          <span className="lobby-mode-icon bg-teal" aria-hidden="true">+</span><span><span className="block text-base font-extrabold">Play a friend</span><span className="mt-1 block text-xs leading-4 text-muted">Private room code</span></span>
        </button>
        <button className="lobby-mode lobby-mode-today flex min-h-24 items-center gap-3 rounded-2xl border border-line bg-card px-5 py-4 text-left shadow-xs transition-colors hover:bg-lemon-soft" onClick={onToday}>
          <span className="lobby-mode-icon bg-lemon" aria-hidden="true">*</span><span><span className="block text-base font-extrabold">Today&apos;s Run</span><span className="mt-1 block text-xs leading-4 text-muted">Same field for everyone</span></span>
        </button>
        <div className="lobby-proof min-h-24 rounded-2xl border border-line bg-ink px-5 py-4 text-white shadow-xs sm:col-span-2 lg:col-span-1"><span className="block text-xs font-black uppercase tracking-[0.14em] text-teal-soft">League promise</span><span className="mt-2 block text-sm font-bold leading-5">Skill first. Verified scores. Team-funded rewards.</span></div>
      </section>

      {open && <section className="room-form screen-enter mt-3 max-w-2xl rounded-2xl border border-line bg-card p-3 shadow-xs">
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (code.length === 4) onPvp(code); }}>
          <input ref={codeInputRef} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^0-9A-HJ-KM-NP-TV-Z]/g, '').slice(0, 4))} maxLength={4} placeholder="ABCD" aria-label="Room code" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 text-center font-black tracking-[0.35em] outline-hidden" />
          <button className="min-h-11 rounded-xl bg-teal px-4 font-black text-ink shadow-xs disabled:opacity-45" type="submit" disabled={code.length !== 4}>Join</button>
        </form>
        <button className="mt-2 min-h-11 w-full rounded-xl border border-line bg-cream px-4 text-sm font-black text-ink" type="button" onClick={onCreateRoom}>Create a room</button>
        {roomError && <p className="m-0 mt-2 text-sm font-semibold text-coral-deep" role="alert">{roomError}</p>}
      </section>}

      <footer className="lobby-footer mt-5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted">
        <span>{!wallet ? 'Connect to earn streaks' : streak === null ? 'Play Today&apos;s Run to start a streak' : `${streak} day${streak === 1 ? '' : 's'} streak`}</span>
        <span>Verified scores - team-funded rewards</span>
      </footer>
    </main>
  );
}
