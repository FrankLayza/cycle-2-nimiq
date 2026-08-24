import { useEffect, useRef, useState } from 'react';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import type { Room } from 'colyseus.js';
import { MatchScene } from './MatchScene';
import { createMatchGame } from './createMatchGame';
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
    // The field sizes itself to this host in device pixels and follows rotation.
    const { game, dispose } = createMatchGame(host);
    const scene = () => game.scene.getScene('Match') as MatchScene;
    let sim: GameState = createRun(seed, 'bot', SIM_VERSION);
    let running = true;
    let disposed = false;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;

    if (mode === 'pvp' && roomCode) {
      setPhase('connecting');
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
      dispose();
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
    const text = `${result.outcome === 'win' ? '🏆 I won' : result.outcome === 'draw' ? '🤝 I drew' : 'I scored'} ${result.you.score.toLocaleString()} in Competitive Snake. Grow. Boost. Outplay.`;
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

  const isLeading = hud.you > hud.rival;
  const isTied = hud.you === hud.rival;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cream">
      <div
        id="world"
        className="match-shell relative h-full w-full overflow-hidden bg-[#0b0e14] landscape:aspect-video landscape:h-auto landscape:w-[min(100vw,calc(100vh*16/9))] landscape:rounded-2xl shadow-2xl"
      >
        <div ref={hostRef} className="h-full w-full" />

        <div className="match-hud pointer-events-none absolute left-3 right-3 top-3 sm:top-4 mx-auto max-w-2xl flex items-center justify-between gap-2 sm:gap-3 z-10">
          <div className="hud-card-2d min-w-20 sm:min-w-24 rounded-2xl p-2 sm:p-2.5 text-left shadow-md">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-coral shadow-[0_0_8px_#ff686b]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-coral-dark">You</span>
              {isLeading && !isTied && (
                <span className="ml-auto rounded-full bg-lemon px-1.5 py-0.2 text-[8px] font-black text-ink">
                  LEAD
                </span>
              )}
            </div>
            <b key={hud.you} className="score-pop mt-0.5 block text-2xl sm:text-3xl font-black leading-none tabular-nums text-ink">
              {hud.you.toLocaleString()}
            </b>
          </div>

          <div className="flex items-center gap-2">
            <div className="hud-card-dark rounded-2xl px-3.5 py-1.5 sm:px-5 sm:py-2 text-center text-white shadow-md">
              <span className="block text-base sm:text-lg font-black leading-tight tabular-nums tracking-wide">{matchClock}</span>
              <span className={`block text-[9px] font-black uppercase tracking-wider ${shrinkCountdown <= 3 ? 'text-lemon animate-pulse' : 'text-coral-soft'}`}>
                Shrink {String(shrinkCountdown).padStart(2, '0')}s
              </span>
            </div>

            {!result && (
              <button
                type="button"
                className="btn-3d btn-3d-white pointer-events-auto rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] font-black uppercase tracking-wider shadow-sm"
                onClick={onExit}
              >
                Exit
              </button>
            )}
          </div>

          <div className="hud-card-2d min-w-20 sm:min-w-24 rounded-2xl p-2 sm:p-2.5 text-right shadow-md">
            <div className="flex items-center justify-end gap-1.5">
              {!isLeading && !isTied && (
                <span className="mr-auto rounded-full bg-teal px-1.5 py-0.2 text-[8px] font-black text-ink">
                  LEAD
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-wider text-grass-deep">Rival</span>
              <span className="h-2.5 w-2.5 rounded-full bg-teal shadow-[0_0_8px_#35c982]" />
            </div>
            <b key={hud.rival} className="score-pop mt-0.5 block text-2xl sm:text-3xl font-black leading-none tabular-nums text-ink">
              {hud.rival.toLocaleString()}
            </b>
          </div>
        </div>

        {phaseMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/35 backdrop-blur-xs z-20">
            <div className="status-pop w-[min(88%,22rem)] text-center text-ink">
              <div className="loading-snake mx-auto mb-4 h-7 w-20 rounded-full bg-teal" />
              <p className="m-0 text-base font-black tracking-tight">{phaseMessage}</p>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/80 px-6 text-center text-white backdrop-blur-xs z-20">
            <div className="status-pop max-w-sm">
              <p className="text-base font-bold text-coral-deep">{error}</p>
              <button
                type="button"
                className="btn-3d btn-3d-coral mt-4 min-h-12 w-full rounded-xl text-sm font-black"
                onClick={onExit}
              >
                Return to Lobby
              </button>
            </div>
          </div>
        )}

        {/* Desktop Controls Helper - Centered between D-Pad and Boost */}
        <div className="pointer-events-none hidden md:flex absolute bottom-5 left-1/2 -translate-x-1/2 items-center gap-2 rounded-xl bg-ink/80 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-md backdrop-blur-xs z-10">
          <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">WASD / ARROWS</span>
          <span>Turn</span>
          <span className="text-white/40">·</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">SPACE</span>
          <span>Boost</span>
        </div>

        <div className="mobile-control-dock match-controls absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          {!hasTurned && (
            <div className="match-hint pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/80 bg-white/95 px-4 py-2 text-xs font-black text-ink shadow-md backdrop-blur-xs">
              {hud.boosting ? '🔥 Boosting · Tail burning' : '👉 Swipe, tap D-Pad, or use arrow keys'}
            </div>
          )}
          <GameControls
            variant="light"
            disabled={!controlsEnabled}
            boosting={hud.boosting}
            onTurn={setTurn}
            onBoostChange={setBoost}
          />
        </div>
      </div>

      {result && (
        <div className="result-backdrop fixed inset-0 z-20 grid place-items-center bg-ink/65 p-5 text-center backdrop-blur-xs">
          <div className="result-panel w-full max-w-sm rounded-3xl border-2 border-white/85 bg-cream p-6 shadow-2xl sm:p-8">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner text-3xl">
              {result.outcome === 'win' ? '🏆' : result.outcome === 'loss' ? '💔' : '🤝'}
            </div>
            <h2 className="result-hero m-0 text-3xl sm:text-4xl font-black text-ink">
              {result.outcome === 'win' ? 'Victory!' : result.outcome === 'loss' ? 'Rival Wins' : 'Draw Match'}
            </h2>

            <div className="result-score my-4 rounded-2xl border border-line bg-card p-4 shadow-sm">
              <span className="block text-[10px] font-black uppercase tracking-widest text-muted">Final Score</span>
              <strong className="mt-1 block text-4xl font-black leading-none tabular-nums text-ink">
                {result.you.score.toLocaleString()}
              </strong>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-muted">
                <span>{result.you.length} segments</span>
                <span>·</span>
                <span className="font-extrabold text-grass-deep flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  Score Verified
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-3d btn-3d-coral min-h-14 w-full rounded-2xl text-xl font-black"
              onClick={handleRematch}
            >
              REMATCH
            </button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-3d btn-3d-white min-h-12 rounded-xl text-xs font-black"
                onClick={() => void shareResult()}
                disabled={sharing}
              >
                {sharing ? 'Sharing…' : 'Share Score 📤'}
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-white min-h-12 rounded-xl text-xs font-black"
                onClick={onExit}
              >
                Lobby 🏠
              </button>
            </div>
            {shareNote && <p className="m-0 mt-3 text-xs font-bold text-grass-deep" role="status">{shareNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
