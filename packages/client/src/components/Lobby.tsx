interface Props {
  wallet: { address: string } | null;
  onConnectWallet: () => void;
  onPlay: () => void;
}

export function Lobby({ wallet, onConnectWallet, onPlay }: Props) {
  return (
    <div className="lobby">
      <div className="wordmark">SNAKE RINK</div>
      <p className="tagline">60-second skill battles · verified on-chain rewards</p>
      {wallet ? (
        <div className="wallet-chip">
          ✓ {wallet.address.slice(0, 8)}…
        </div>
      ) : (
        <button className="btn-ghost" onClick={onConnectWallet}>
          Connect wallet (silent)
        </button>
      )}
      <button className="btn-play" onClick={onPlay}>
        ▶ PLAY
      </button>
      <div className="lobby-row">
        <button className="btn-secondary" title="Room-code PvP — W2" disabled>
          Room code
        </button>
        <button className="btn-secondary" title="Today's Run — W2" disabled>
          Today&apos;s Run
        </button>
      </div>
      <div className="streak-strip">🔥 0-day streak</div>
      <div className="rewards-teaser">🏆 Daily top-3 pays NIM · replay-verified</div>
    </div>
  );
}
