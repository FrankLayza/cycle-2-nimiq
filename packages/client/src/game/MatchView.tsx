import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import type { Room } from 'colyseus.js';
import { MatchScene } from './MatchScene';
import { snapshotFromGame, snapshotFromRoom } from './renderState';
import { swipeToDir } from './input';
import { useKeyboardControls } from './useKeyboard';
import { GameControls } from '../components/GameControls';
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
  const [shareNote, setShareNote] = useState('');
  const [hasTurned, setHasTurned] = useState(false);
  const rematchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (rematchTimer.current) clearTimeout(rematchTimer.current);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const seed = (Math.random() * 0xffffffff) >>> 0;
    const portrait = window.innerHeight > window.innerWidth;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: portrait ? 720 : 1280,
      height: portrait ? 1280 : 720,
      backgroundColor: '#8fd46a',
      scene: [MatchScene],
    });
    const scene = () => game.scene.getScene('Match') as MatchScene;
    let sim: GameState = createRun(seed, 'bot', SIM_VERSION);
    let running = true;
    let disposed = false;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;

    if (mode === 'pvp' && roomCode) {
      setPhase('connecting');
      // React StrictMode mounts effects once, cleans them up, then mounts
      // them again in development. Defer the network join so the probe
      // connection is cancelled before it can occupy a room seat.
      connectTimer = setTimeout(() => {
        const client = createMatchClient();
        void joinPvp(client, roomCode, wallet)
          .then((joined) => {
            if (disposed) {
              void joined.leave();
              return;
            }
            roomRef.current = joined;

            const applyState = (state: ClientMatchState) => {
              if (state.status !== 'finished' && rematchTimer.current) {
                clearTimeout(rematchTimer.current);
                rematchTimer.current = null;
              }
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
                buzz(8);
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
      }, 0);
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
        const dir = swipeToDir(dx, dy);
        pendingRef.current = { ...pendingRef.current, turn: dir };
        setHasTurned(true);
      }
      start = null;
    };
    canvas?.addEventListener('pointerdown', onDown);
    canvas?.addEventListener('pointerup', onUp);

    return () => {
      disposed = true;
      clearInterval(interval);
      if (connectTimer) clearTimeout(connectTimer);
      canvas?.removeEventListener('pointerdown', onDown);
      canvas?.removeEventListener('pointerup', onUp);
      void roomRef.current?.leave();
      roomRef.current = null;
      game.destroy(true);
    };
  }, [mode, roomCode, wallet]);

  const setTurn = (turn: Dir) => {
    pendingRef.current = { ...pendingRef.current, turn };
    setHasTurned(true);
  };
  const setBoost = (boost: boolean) => {
    pendingRef.current = { ...pendingRef.current, boost };
  };
  useKeyboardControls(phase === 'playing', setTurn, setBoost);
  const handleRematch = () => {
    if (mode === 'pvp' && roomRef.current) {
      setResult(null);
      setPhase('countdown');
      roomRef.current.send('rematch');
      if (rematchTimer.current) clearTimeout(rematchTimer.current);
      rematchTimer.current = setTimeout(() => {
        if (roomRef.current?.state.status !== 'countdown') {
          setError('Rematch timed out. Your rival may have left the room.');
          setPhase('error');
        }
      }, 6000);
      return;
    }
    onRematch();
  };

  const shareResult = async () => {
    if (!result) return;
    const text = `${result.outcome === 'win' ? 'I won' : result.outcome === 'draw' ? 'I drew' : 'I scored'} ${result.you.score.toLocaleString()} in Competitive Snake. Grow. Boost. Outplay.`;
    setSharing(true);
    setShareNote('');
    try {
      if (navigator.share) await navigator.share({ title: 'Competitive Snake', text });
      else {
        await navigator.clipboard.writeText(text);
        setShareNote('Copied to clipboard');
      }
    } catch {
      /* user cancelled the share sheet; nothing to report */
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
        className="match-shell relative h-full w-full overflow-hidden bg-[#0b0e14] landscape:aspect-video landscape:h-auto landscape:w-[min(100vw,calc(100vh*16/9))] landscape:rounded-[10px]"
      >
        <div ref={hostRef} className="h-full w-full" />
        <div className="match-hud pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <div className="match-stat min-w-24 rounded-2xl border border-white/75 bg-white/88 px-3.5 py-2.5 text-left text-ink shadow-xs backdrop-blur-xs">
            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-coral-dark">You</span>
            <b key={hud.you} className="score-pop mt-0.5 block text-2xl leading-none tabular-nums">{hud.you.toLocaleString()}</b>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="match-clock rounded-2xl border border-white/75 bg-ink/90 px-4 py-2.5 text-center font-black text-white shadow-xs backdrop-blur-xs">
              <span className="block text-lg leading-none tabular-nums">{matchClock}</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-coral-soft">Shrink {String(shrinkCountdown).padStart(2, '0')}</span>
            </div>
            {!result && (
              <button
                className="pointer-events-auto min-h-11 rounded-full border border-white/75 bg-white/88 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-ink shadow-xs backdrop-blur-xs"
                onClick={onExit}
              >
                Exit match
              </button>
            )}
          </div>
          <div className="match-stat min-w-24 rounded-2xl border border-white/75 bg-white/88 px-3.5 py-2.5 text-right text-ink shadow-xs backdrop-blur-xs">
            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-grass">Rival</span>
            <b key={hud.rival} className="score-pop mt-0.5 block text-2xl leading-none tabular-nums">{hud.rival.toLocaleString()}</b>
          </div>
        </div>

        {phaseMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/25 backdrop-blur-xs">
            <div className="status-panel w-[min(88%,20rem)] rounded-2xl bg-cream px-6 py-5 text-center text-ink shadow-xs">
              <div className="loading-snake mx-auto mb-4 h-6 w-16 rounded-full bg-teal" />
              {phaseMessage}
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 px-6 text-center text-white">
            <p className="max-w-[42ch] text-base">{error}</p>
            <button className="button-primary min-h-12 rounded-xl bg-white px-5 py-2 font-bold text-ink" onClick={onExit}>
              Return to lobby
            </button>
          </div>
        )}

        <div className="mobile-control-dock match-controls absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          {!hasTurned && (
            <div className="match-hint pointer-events-none absolute bottom-[94px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/75 bg-white/88 px-3.5 py-2 text-[12px] font-bold text-ink shadow-xs backdrop-blur-xs">
              {hud.boosting ? 'Boosting · tail burns' : 'Swipe, tap the pad, or use arrow keys'}
            </div>
          )}
          <GameControls variant="light" disabled={!controlsEnabled} boosting={hud.boosting} onTurn={setTurn} onBoostChange={setBoost} />
        </div>
      </div>

      {result && (
        <div className="result-backdrop fixed inset-0 z-10 grid place-items-center bg-ink/55 p-5 text-center backdrop-blur-xs">
          <div className="result-panel w-full max-w-sm rounded-2xl border border-white/70 bg-cream p-6 shadow-[0_24px_70px_rgb(23_34_53_/_28%)] sm:p-8">
          <h2 className="result-hero m-0 text-4xl font-black">{result.outcome === 'win' ? 'You win' : result.outcome === 'loss' ? 'Rival wins' : 'Draw'}</h2>
          <div className="result-score mx-auto rounded-2xl border border-line bg-white px-4 py-3"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-muted">Your score</span><strong className="mt-1 block text-3xl font-black leading-none tabular-nums">{result.you.score.toLocaleString()}</strong></div>
          <p className="result-detail m-0 mb-2 text-sm text-muted">{result.you.length} segments · <span className="font-semibold text-grass-deep">Score verified</span></p>
          <button
            className="button-primary mt-4 min-h-14 w-full rounded-2xl border-none bg-coral p-4 text-xl font-extrabold text-ink"
            onClick={handleRematch}
          >
            Rematch
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-bold text-ink" onClick={() => void shareResult()} disabled={sharing}>{sharing ? 'Sharing…' : 'Share'}</button>
            <button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-bold text-ink" onClick={onExit}>Lobby</button>
          </div>
          {shareNote && <p className="m-0 mt-2 text-xs font-semibold text-grass-deep" role="status">{shareNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
