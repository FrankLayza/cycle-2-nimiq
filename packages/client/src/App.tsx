import { useEffect, useState } from 'react';
import { Lobby } from './components/Lobby';
import { MatchView } from './game/MatchView';
import { connectWallet, getWallet, initializeWallet } from './wallet/provider';
import type { WalletIdentity } from './wallet/provider';

export function App() {
  const [screen, setScreen] = useState<'lobby' | 'match' | 'pvp'>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [matchKey, setMatchKey] = useState(0);
  const [wallet, setWallet] = useState<WalletIdentity | null>(getWallet());

  useEffect(() => {
    void initializeWallet();
  }, []);

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
          onPvp={(code) => { setRoomCode(code); setScreen('pvp'); }}
        />
      ) : screen === 'match' ? (
        <MatchView
          key={matchKey}
          onExit={() => setScreen('lobby')}
          onRematch={() => setMatchKey((k) => k + 1)}
        />
      ) : <MatchView key={roomCode} mode="pvp" roomCode={roomCode} wallet={wallet?.address} onExit={() => setScreen('lobby')} onRematch={() => setRoomCode(roomCode)} />}
    </div>
  );
}
