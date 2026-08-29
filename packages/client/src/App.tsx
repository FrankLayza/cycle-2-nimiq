import { lazy, Suspense, useEffect, useState } from 'react';
import { Lobby } from './components/Lobby';
import { LandscapeStage } from './shell/LandscapeStage';
import { connectWallet, getWallet, initializeWallet } from './wallet/provider';
import type { WalletIdentity } from './wallet/provider';

const MatchView = lazy(() => import('./game/MatchView').then((module) => ({ default: module.MatchView })));
const TodayRunView = lazy(() => import('./daily/TodayRunView').then((module) => ({ default: module.TodayRunView })));

export function App() {
  const [screen, setScreen] = useState<'lobby' | 'match' | 'pvp' | 'today'>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [matchKey, setMatchKey] = useState(0);
  const [wallet, setWallet] = useState<WalletIdentity | null>(getWallet());
  const [roomError, setRoomError] = useState('');

  useEffect(() => {
    void initializeWallet();
  }, []);

  const handleConnect = async () => {
    setWallet(await connectWallet());
  };

  const handleCreateRoom = async () => {
    setRoomError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/rooms`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'pvp', maxPlayers: 4 }),
      });
      if (!response.ok) throw new Error('Could not create room');
      const room = await response.json() as { code: string };
      setRoomCode(room.code);
      setScreen('pvp');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Could not create room');
    }
  };

  const enterFullscreen = () => {
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <LandscapeStage>
      <div className="app h-full min-h-full overflow-hidden">
        {screen === 'lobby' ? (
          <Lobby
            wallet={wallet}
            onConnectWallet={handleConnect}
            onPlay={() => {
              enterFullscreen();
              setMatchKey((k) => k + 1);
              setScreen('match');
            }}
            onPvp={(code) => {
              enterFullscreen();
              setRoomCode(code);
              setScreen('pvp');
            }}
            onToday={() => {
              enterFullscreen();
              setScreen('today');
            }}
            onCreateRoom={() => void handleCreateRoom()}
            roomError={roomError}
          />
        ) : screen === 'match' ? (
          <Suspense fallback={<ScreenLoader label="Preparing the rink" />}>
            <MatchView
              key={matchKey}
              onExit={() => setScreen('lobby')}
              onRematch={() => setMatchKey((k) => k + 1)}
            />
          </Suspense>
        ) : screen === 'today' ? (
          <Suspense fallback={<ScreenLoader label="Preparing today's field" />}>
            <TodayRunView wallet={wallet} onExit={() => setScreen('lobby')} />
          </Suspense>
        ) : (
          <Suspense fallback={<ScreenLoader label="Connecting to the match" />}>
            <MatchView
              key={roomCode}
              mode="pvp"
              roomCode={roomCode}
              wallet={wallet?.address}
              onExit={() => setScreen('lobby')}
              onRematch={() => setRoomCode(roomCode)}
            />
          </Suspense>
        )}
      </div>
    </LandscapeStage>
  );
}

function ScreenLoader({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-cream text-center p-6">
      <div className="status-pop flex flex-col items-center">
        <div className="loading-snake mb-5 h-8 w-28 rounded-full bg-teal shadow-xs" />
        <p className="m-0 text-base font-black tracking-tight text-ink">{label}</p>
        <span className="mt-2 text-xs font-bold text-muted">Competitive Snake</span>
      </div>
    </div>
  );
}
