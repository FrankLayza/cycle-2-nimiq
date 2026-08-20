import { lazy, Suspense, useEffect, useState } from 'react';
import { Lobby } from './components/Lobby';
import { connectWallet, getWallet, initializeWallet } from './wallet/provider';
import type { WalletIdentity } from './wallet/provider';

const MatchView = lazy(() => import('./game/MatchView').then((module) => ({ default: module.MatchView })));
const TodayRunView = lazy(() => import('./daily/TodayRunView').then((module) => ({ default: module.TodayRunView })));

export function App() {
  const [screen, setScreen] = useState<'lobby' | 'match' | 'pvp' | 'today'>('lobby');
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
          onToday={() => setScreen('today')}
        />
      ) : screen === 'match' ? (
        <Suspense fallback={<ScreenLoader label="Preparing the field…" />}><MatchView
          key={matchKey}
          onExit={() => setScreen('lobby')}
          onRematch={() => setMatchKey((k) => k + 1)}
        /></Suspense>
      ) : screen === 'today' ? <Suspense fallback={<ScreenLoader label="Preparing today’s field…" />}><TodayRunView wallet={wallet} onExit={() => setScreen('lobby')} /></Suspense> : <Suspense fallback={<ScreenLoader label="Joining the room…" />}><MatchView key={roomCode} mode="pvp" roomCode={roomCode} wallet={wallet?.address} onExit={() => setScreen('lobby')} onRematch={() => setRoomCode(roomCode)} /></Suspense>}
    </div>
  );
}

function ScreenLoader({ label }: { label: string }) {
  return <div className="fixed inset-0 grid place-items-center bg-cream text-center"><div><div className="loading-snake mx-auto mb-4 h-8 w-24 rounded-full bg-teal" /><p className="font-bold text-ink">{label}</p></div></div>;
}
