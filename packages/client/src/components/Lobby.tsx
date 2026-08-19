import { useState } from 'react';
import { normalizeRoomCode } from '../net/client';

interface Props {
  wallet: { address: string } | null;
  onConnectWallet: () => void;
  onPlay: () => void;
  onPvp: (code: string) => void;
  onToday: () => void;
}

export function Lobby({ wallet, onConnectWallet, onPlay, onPvp }: Props) {
  const params = new URLSearchParams(window.location.search);
  const initialCode = params.get('room') ?? '';
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [open, setOpen] = useState(Boolean(initialCode));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5 p-5 text-center">
      <div className="text-[34px] font-extrabold tracking-wide">SNAKE RINK</div>
      <p className="m-0 mb-2 text-muted">60-second skill battles · verified on-chain rewards</p>
      {wallet ? (
        <div className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px]">
          ✓ {wallet.address.slice(0, 8)}…
        </div>
      ) : (
        <button
          className="cursor-pointer rounded-full border-[1.5px] border-teal bg-transparent px-4 py-2 text-[13px] text-ink"
          onClick={onConnectWallet}
        >
          Connect wallet (silent)
        </button>
      )}
      <button
        className="w-[210px] cursor-pointer rounded-[14px] border-none bg-coral p-4 text-xl font-extrabold text-white shadow-[0_6px_0_var(--color-coral-dark)] active:translate-y-[3px] active:shadow-[0_3px_0_var(--color-coral-dark)]"
        onClick={onPlay}
      >
        ▶ PLAY
      </button>
      <div className="flex gap-3">
        <button className="btn-secondary rounded-xl border-[1.5px] border-line bg-card px-4 py-2.5 text-sm" onClick={() => setOpen(true)}>
          Room code
        </button>
        <button className="btn-secondary rounded-xl border-[1.5px] border-line bg-card px-4 py-2.5 text-sm" onClick={onToday}>
          Today&apos;s Run
        </button>
      </div>
      {open && <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.length === 4) onPvp(code); }}><input autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-HJ-KM-NP-TV-Z]/g, '').slice(0,4))} maxLength={4} placeholder="ABCD" aria-label="Room code" className="w-24 rounded-xl border border-line bg-card px-3 py-2 text-center font-bold tracking-widest" /><button className="rounded-xl bg-teal px-3 py-2 font-bold" type="submit" disabled={code.length !== 4}>Join</button></form>}
      <div className="text-[13px] text-muted">🔥 0-day streak</div>
      <div className="rounded-[10px] bg-[#fff8dc] px-3.5 py-2 text-[13px]">
        🏆 Daily top-3 pays NIM · replay-verified
      </div>
    </div>
  );
}
