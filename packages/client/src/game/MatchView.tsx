import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import type { Room } from 'colyseus.js';
import { MatchScene } from './MatchScene';
import { snapshotFromGame, snapshotFromRoom } from './renderState';
import { swipeToDir } from './input';
import { createMatchClient, joinPvp } from '../net/client';
import type { ClientMatchState } from '../net/client';

function buzz(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

interface Props {
  onExit: () => void;
  onRematch: () => void;
  mode?: 'bot' | 'pvp';
  roomCode?: string;
  wallet?: string;
}

interface HudState {
  you: number;
  rival: number;
  alive: number;
  boundary: number;
  seed: number;
  boosting: boolean;
  tick: number;
}

interface ResultState {
  outcome: 'win' | 'loss' | 'draw';
  you: { score: number; length: number };
}

type MatchPhase = 'connecting' | 'waiting' | 'countdown' | 'playing' | 'finished' | 'error';

interface MatchResultJson {
  winner: number | null;
  snakes: Array<{ id: number; score: number; length: number }>;
}

function outcomeFor(winner: number | null, ownSeat: number): ResultState['outcome'] {
  if (winner === null) return 'draw';
  return winner === ownSeat ? 'win' : 'loss';
}

export function MatchView({ onExit, onRematch, mode = 'bot', roomCode, wallet }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<Room<ClientMatchState> | null>(null);
  const pendingRef = useRef<AppliedInput>({ turn: null, boost: false });
  const [hud, setHud] = useState<HudState>({
    you: 0,
    rival: 0,
    alive: 2,
    boundary: 30,
    seed: 0,
    boosting: false,
    tick: 0,
  });
  const [phase, setPhase] = useState<MatchPhase>(mode === 'pvp' ? 'connecting' : 'playing');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ResultState | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const seed = (Math.random() * 0xffffffff) >>> 0;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: 1280,
      height: 720,
      backgroundColor: '#8fd46a',
      scene: [MatchScene],
    });
    const scene = () => game.scene.getScene('Match') as MatchScene;
    let sim: GameState = createRun(seed, 'bot', SIM_VERSION);
    let running = true;
    let disposed = false;

    if (mode === 'pvp' && roomCode) {
      setPhase('connecting');
      const client = createMatchClient();
      void joinPvp(client, roomCode, wallet)
        .then((joined) => {
          if (disposed) {
            void joined.leave();
            return;
          }
          roomRef.current = joined;

          const applyState = (state: ClientMatchState) => {
            scene().submitSnapshot(snapshotFromRoom(state));
            const snakes = Array.from(state.snakes.values());
            const own = snakes.find((snake) => snake.sessionId === joined.sessionId);
            const rival = snakes.find((snake) => snake.sessionId !== joined.sessionId);
            setHud({
              you: own?.score ?? 0,
              rival: rival?.score ?? 0,
              alive: snakes.filter((snake) => snake.alive).length,
              boundary: state.boundary,
              seed: state.seed,
              boosting: own?.boosting ?? false,
              tick: state.tick,
            });
            setCountdown(state.countdown);

            if (state.status === 'lobby') setPhase('waiting');
            if (state.status === 'countdown') setPhase('countdown');
            if (state.status === 'playing') setPhase('playing');
            if (state.status === 'finished' && state.resultJson) {
              setPhase('finished');
              const parsed = JSON.parse(state.resultJson) as MatchResultJson;
              const ownSeat = own?.seat ?? 0;
              const ownResult = parsed.snakes.find((snake) => snake.id === ownSeat);
            setResult({
                outcome: outcomeFor(parsed.winner, ownSeat),
                you: { score: ownResult?.score ?? 0, length: ownResult?.length ?? 0 },
              });
              buzz(phase === 'finished' ? [14, 20, 14] : 8);
            }
          };

          joined.onStateChange(applyState);
          joined.onError((_code, message) => {
            if (disposed) return;
            setError(message || 'The match connection failed.');
            setPhase('error');
          });
          joined.onLeave((code) => {
            if (disposed || code === 1000) return;
            setError('The match connection closed. Return to the lobby and try again.');
            setPhase('error');
          });
          applyState(joined.state);
        })
        .catch(() => {
          if (disposed) return;
          setError('Could not join this room. Check the code and try again.');
          setPhase('error');
        });
    }

    const interval = setInterval(() => {
      if (!running) return;
      const input = pendingRef.current;

      if (mode === 'pvp') {
        const room = roomRef.current;
        if (room?.state.status === 'playing') {
          room.send('input', input);
          pendingRef.current = { turn: null, boost: input.boost };
        }
        return;
      }

      const inputs: AppliedInput[] = [{ turn: input.turn, boost: input.boost }, botPolicy(sim, 1)];
      pendingRef.current = { turn: null, boost: input.boost };
      sim = step(sim, inputs);
      scene().submitSnapshot(snapshotFromGame(sim));
      setHud({
        you: sim.snakes[0].score,
        rival: sim.snakes[1].score,
        alive: sim.snakes.filter((snake) => snake.alive).length,
        boundary: sim.bounds.x1 - sim.bounds.x0 + 1,
        seed,
        boosting: sim.snakes[0].boost,
        tick: sim.tick,
      });
      if (isTerminal(sim)) {
        running = false;
        setPhase('finished');
        setResult({
          outcome: outcomeFor(winnerOf(sim), 0),
          you: { score: sim.snakes[0].score, length: sim.snakes[0].cells.length },
        });
        buzz(8);
      }
    }, TICK_MS);

    const canvas = host.querySelector('canvas');
    let start: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      start = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 24) {
        pendingRef.current = { ...pendingRef.current, turn: swipeToDir(dx, dy) };
      }
      start = null;
    };
    canvas?.addEventListener('pointerdown', onDown);
    canvas?.addEventListener('pointerup', onUp);

    return () => {
      disposed = true;
      clearInterval(interval);
      canvas?.removeEventListener('pointerdown', onDown);
      canvas?.removeEventListener('pointerup', onUp);
      void roomRef.current?.leave();
      roomRef.current = null;
      game.destroy(true);
    };
  }, [mode, roomCode, wallet]);

  const setTurn = (turn: Dir) => {
    pendingRef.current = { ...pendingRef.current, turn };
  };
  const setBoost = (boost: boolean) => {
    pendingRef.current = { ...pendingRef.current, boost };
  };
  const handleRematch = () => {
    if (mode === 'pvp' && roomRef.current) {
      setResult(null);
      setPhase('countdown');
      roomRef.current.send('rematch');
      return;
    }
    onRematch();
  };

  const shareResult = async () => {
    if (!result) return;
    const text = `${result.outcome === 'win' ? 'I won' : result.outcome === 'draw' ? 'I drew' : 'I scored'} ${result.you.score.toLocaleString()} in Competitive Snake. Grow. Boost. Outplay.`;
    setSharing(true);
    try {
      if (navigator.share) await navigator.share({ title: 'Competitive Snake', text });
      else await navigator.clipboard.writeText(text);
    } finally {
      setSharing(false);
    }
  };

  const controlsEnabled = phase === 'playing';
  const elapsedSeconds = Math.floor((hud.tick * TICK_MS) / 1000);
  const matchClock = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const shrinkCountdown = Math.max(0, 10 - (elapsedSeconds % 10));
  const phaseMessage =
    phase === 'connecting'
      ? 'Connecting to room...'
      : phase === 'waiting'
        ? `Room ${roomCode}: waiting for opponent`
        : phase === 'countdown'
          ? countdown > 0
            ? String(countdown)
            : 'Get ready'
          : null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cream">
      <div
        id="world"
        className="relative aspect-video w-[min(100vw,calc(100vh*16/9))] overflow-hidden rounded-[10px] bg-[#0b0e14] portrait:w-[min(100vh,calc(100vw*16/9))] portrait:rotate-90"
      >
        <div ref={hostRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <div className="min-w-24 rounded-full border border-white/70 bg-cream/90 px-4 py-2 text-left text-ink shadow-xs">
            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-coral-dark">You</span>
            <b className="block text-2xl leading-none tabular-nums">{hud.you.toLocaleString()}</b>
          </div>
          <div className="rounded-full border border-white/70 bg-cream/90 px-4 py-2 text-center font-black text-ink shadow-xs">
            <span className="block text-lg leading-none tabular-nums">{matchClock}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-coral-dark">Shrink {String(shrinkCountdown).padStart(2, '0')}</span>
          </div>
          <div className="min-w-24 rounded-full border border-white/70 bg-cream/90 px-4 py-2 text-right text-ink shadow-xs">
            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-grass">Rival</span>
            <b className="block text-2xl leading-none tabular-nums">{hud.rival.toLocaleString()}</b>
          </div>
        </div>

        {phaseMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/35">
            <div className="rounded-2xl bg-white px-6 py-4 text-center text-lg font-bold text-ink shadow-sm">
              {phaseMessage}
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 px-6 text-center text-white">
            <p className="max-w-[42ch] text-base">{error}</p>
            <button className="rounded-xl bg-white px-4 py-2 font-bold text-ink" onClick={onExit}>
              Return to lobby
            </button>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="grid grid-cols-3 grid-rows-3 gap-0 rounded-full border border-white/70 bg-cream/90 p-1.5 shadow-xs">
            <button
              className="control-button col-start-2 row-start-1 min-h-11 min-w-11 rounded-t-full border border-line bg-card text-lg text-ink shadow-xs disabled:opacity-45"
              disabled={!controlsEnabled}
              aria-label="Turn up"
              onPointerDown={() => setTurn('up')}
            >
              ▲
            </button>
            <button
              className="control-button col-start-1 row-start-2 min-h-11 min-w-11 rounded-l-full border border-line bg-card text-lg text-ink shadow-xs disabled:opacity-45"
              disabled={!controlsEnabled}
              aria-label="Turn left"
              onPointerDown={() => setTurn('left')}
            >
              ◀
            </button>
            <button
              className="control-button col-start-2 row-start-3 min-h-11 min-w-11 rounded-b-full border border-line bg-card text-lg text-ink shadow-xs disabled:opacity-45"
              disabled={!controlsEnabled}
              aria-label="Turn down"
              onPointerDown={() => setTurn('down')}
            >
              ▼
            </button>
            <button
              className="control-button col-start-3 row-start-2 min-h-11 min-w-11 rounded-r-full border border-line bg-card text-lg text-ink shadow-xs disabled:opacity-45"
              disabled={!controlsEnabled}
              aria-label="Turn right"
              onPointerDown={() => setTurn('right')}
            >
              ▶
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-[92px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-ink/10 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink shadow-sm">
            {hud.boosting ? 'Boosting · tail burns' : 'Hold boost to speed up'}
          </div>
          <button
            className="control-button h-24 w-24 rounded-full border-[6px] border-white/80 bg-lemon text-sm font-black text-ink shadow-[0_5px_0_#d6be28] disabled:opacity-45"
            disabled={!controlsEnabled}
            onPointerDown={() => setBoost(true)}
            onPointerUp={() => setBoost(false)}
            onPointerCancel={() => setBoost(false)}
            onPointerLeave={() => setBoost(false)}
          >
            BOOST
          </button>
        </div>
      </div>

      {result && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-cream/95 text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-muted">Match result</p>
          <h2 className="result-hero m-0 text-4xl font-black">{result.outcome === 'win' ? 'You win' : result.outcome === 'loss' ? 'Rival wins' : 'Draw'}</h2>
          <p className="result-score m-0 text-lg font-bold tabular-nums">{result.you.score.toLocaleString()} score</p>
          <p className="result-detail m-0 mb-2 text-sm text-muted">{result.you.length} segments · <span className="font-semibold text-teal">Score verified</span></p>
          <button
            className="w-[210px] cursor-pointer rounded-[14px] border-none bg-coral p-4 text-xl font-extrabold text-white shadow-[0_6px_0_var(--color-coral-dark)] active:translate-y-[3px] active:shadow-[0_3px_0_var(--color-coral-dark)]"
            onClick={handleRematch}
          >
            Rematch
          </button>
          <div className="flex gap-2">
            <button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-bold text-ink" onClick={() => void shareResult()} disabled={sharing}>{sharing ? 'Sharing…' : 'Share'}</button>
            <button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-bold text-ink" onClick={onExit}>Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}
