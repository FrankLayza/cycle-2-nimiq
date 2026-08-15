import { useState } from 'react';
import { Lobby } from './components/Lobby';
import { MatchView } from './game/MatchView';
import { connectWallet, getWallet } from './wallet/stub';
import type { WalletStub } from './wallet/stub';

export function App() {
  const [screen, setScreen] = useState<'lobby' | 'match'>('lobby');
  const [matchKey, setMatchKey] = useState(0);
  const [wallet, setWallet] = useState<WalletStub | null>(getWallet());

  const handleConnect = async () => {
    setWallet(await connectWallet());
  };

  return (
    <div className="app h-full">
      {screen === 'lobby' ? (
        <Lobby
          wallet={wallet}
          onConnectWallet={handleConnect}
          onPlay={() => {
            setMatchKey((k) => k + 1);
            setScreen('match');
          }}
        />
      ) : (
        <MatchView
          key={matchKey}
          onExit={() => setScreen('lobby')}
          onRematch={() => setMatchKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
