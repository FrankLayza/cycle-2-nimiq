interface Props {
  wallet: { address: string } | null;
  onConnectWallet: () => void;
  onPlay: () => void;
}

export function Lobby({ wallet, onConnectWallet, onPlay }: Props) {
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
        <button className="btn-secondary cursor-not-allowed rounded-xl border-[1.5px] border-line bg-card px-4 py-2.5 text-sm opacity-55" title="Room-code PvP — W2" disabled>
          Room code
        </button>
        <button className="btn-secondary cursor-not-allowed rounded-xl border-[1.5px] border-line bg-card px-4 py-2.5 text-sm opacity-55" title="Today's Run — W2" disabled>
          Today&apos;s Run
        </button>
      </div>
      <div className="text-[13px] text-muted">🔥 0-day streak</div>
      <div className="rounded-[10px] bg-[#fff8dc] px-3.5 py-2 text-[13px]">
        🏆 Daily top-3 pays NIM · replay-verified
      </div>
    </div>
  );
}
