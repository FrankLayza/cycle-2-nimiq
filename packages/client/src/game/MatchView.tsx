import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import { MatchScene } from './MatchScene';
import { swipeToDir } from './input';
import { createMatchClient, joinPvp } from '../net/client';

interface Props {
  onExit: () => void;
  onRematch: () => void;
  mode?: 'bot' | 'pvp';
  roomCode?: string;
  wallet?: string;
}

interface HudState {
  you: number;
  bot: number;
  alive: number;
  boundary: number;
  seed: number;
  boosting: boolean;
}

interface ResultState {
  winner: number | null;
  you: { score: number; length: number };
}

/**
 * W1 match: a LOCAL bot run (spike path) — the client owns the sim for
 * free-play and renders via Phaser (render-only). PvP via Colyseus replaces
 * the local bot path in W2 (room-code PvP milestone).
 */
export function MatchView({ onExit, onRematch, mode = 'bot', roomCode, wallet }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<AppliedInput>({ turn: null, boost: false });
  const [hud, setHud] = useState<HudState>({ you: 0, bot: 0, alive: 2, boundary: 30, seed: 0, boosting: false });
  const [result, setResult] = useState<ResultState | null>(null);

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
    let room: Awaited<ReturnType<typeof joinPvp>> | null = null;
    let networked = false;
    if (mode === 'pvp' && roomCode) {
      const client = createMatchClient();
      void joinPvp(client, roomCode, wallet).then((joined) => {
        room = joined;
        networked = true;
        joined.onStateChange((state) => {
          const you = state.snakes.get('0');
          const rival = state.snakes.get('1');
          setHud({ you: you?.score ?? 0, bot: rival?.score ?? 0, alive: [...state.snakes.values()].filter((s) => s.alive).length, boundary: state.boundary, seed: state.seed, boosting: you?.boosting ?? false });
          if (state.status === 'finished' && state.resultJson) {
            const result = JSON.parse(state.resultJson) as { winner: number | null; snakes: Array<{ id: number; score: number; length: number }> };
            const own = result.snakes.find((s) => s.id === 0);
            setResult({ winner: result.winner, you: { score: own?.score ?? 0, length: own?.length ?? 0 } });
          }
        });
      }).catch(() => setResult({ winner: null, you: { score: 0, length: 0 } }));
    }
    let running = true;

    const interval = setInterval(() => {
      if (!running) return;
      const a = pendingRef.current;
      if (networked && room) { room.send('input', a); return; }
      const inputs: AppliedInput[] = [{ turn: a.turn, boost: a.boost }, botPolicy(sim, 1)];
      pendingRef.current = { turn: null, boost: a.boost }; // turn consumed; boost persists while held
      sim = step(sim, inputs);
      scene().renderState(sim);
      setHud({
        you: sim.snakes[0].score,
        bot: sim.snakes[1].score,
        alive: sim.snakes.filter((s) => s.alive).length,
        boundary: sim.bounds.x1 - sim.bounds.x0 + 1,
        seed,
        boosting: sim.snakes[0].boost,
      });
      if (isTerminal(sim)) {
        running = false;
        clearInterval(interval);
        setResult({
          winner: winnerOf(sim),
          you: { score: sim.snakes[0].score, length: sim.snakes[0].cells.length },
        });
      }
    }, TICK_MS);

    // Swipe steering on the canvas (rotation-compensated).
    const canvas = host.querySelector('canvas');
    let start: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 24) {
        pendingRef.current = { ...pendingRef.current, turn: swipeToDir(dx, dy) };
      }
      start = null;
    };
    canvas?.addEventListener('pointerdown', onDown);
    canvas?.addEventListener('pointerup', onUp);

    return () => {
      clearInterval(interval);
      canvas?.removeEventListener('pointerdown', onDown);
      canvas?.removeEventListener('pointerup', onUp);
      room?.leave();
      game.destroy(true);
    };
  }, []);

  const setTurn = (turn: Dir) => {
    pendingRef.current = { ...pendingRef.current, turn };
  };
  const setBoost = (v: boolean) => {
    pendingRef.current = { ...pendingRef.current, boost: v };
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cream">
      <div
        id="world"
        className="relative aspect-video w-[min(100vw,calc(100vh*16/9))] overflow-hidden rounded-[10px] bg-[#0b0e14] portrait:w-[min(100vh,calc(100vw*16/9))] portrait:rotate-90"
      >
        <div ref={hostRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-1.5 right-1.5 top-1.5 flex items-center justify-between gap-2 whitespace-nowrap rounded-[10px] bg-ink/85 px-2.5 py-1.5 text-[13px] text-white">
          <span>
            YOU <b className="text-[#ffb3b3]">{hud.you}</b>
          </span>
          <span>
            ⚔ {hud.alive} · shrink <b className="text-lemon">{hud.boundary}</b>
          </span>
          <span>seed {hud.seed}</span>
        </div>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-2.5">
          <div className="grid grid-cols-3 grid-rows-2 gap-[5px]">
            <button
              className="col-start-2 row-start-1 rounded-lg border border-[#3d4a61] bg-[#2a3444] text-lg text-white active:bg-[#4a5b78]"
              onPointerDown={() => setTurn('up')}
            >
              ▲
            </button>
            <button
              className="col-start-1 row-start-2 rounded-lg border border-[#3d4a61] bg-[#2a3444] text-lg text-white active:bg-[#4a5b78]"
              onPointerDown={() => setTurn('left')}
            >
              ◀
            </button>
            <button
              className="col-start-2 row-start-2 rounded-lg border border-[#3d4a61] bg-[#2a3444] text-lg text-white active:bg-[#4a5b78]"
              onPointerDown={() => setTurn('down')}
            >
              ▼
            </button>
            <button
              className="col-start-3 row-start-2 rounded-lg border border-[#3d4a61] bg-[#2a3444] text-lg text-white active:bg-[#4a5b78]"
              onPointerDown={() => setTurn('right')}
            >
              ▶
            </button>
          </div>
          <div className="pointer-events-none absolute left-1/2 top-[52px] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3.5 py-2 text-[13px] text-ink shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            {hud.boosting ? 'BOOSTING — burning tail!' : 'hold BOOST to speed up!'}
          </div>
          <button
            className="h-[76px] w-24 rounded-[14px] border-none bg-linear-to-b from-[#f2b04d] to-[#d18a1c] text-base font-bold text-[#2b1a00] active:scale-95"
            onPointerDown={() => setBoost(true)}
            onPointerUp={() => setBoost(false)}
            onPointerLeave={() => setBoost(false)}
          >
            BOOST
          </button>
        </div>
      </div>
      {result && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-cream/95 text-center">
          <h2>
            {result.winner === 0 ? '🏆 You win!' : result.winner === 1 ? '🤖 Bot wins.' : '💀 Draw'}
          </h2>
          <p className="m-0 mb-2 text-muted">
            Score {result.you.score} · Length {result.you.length}
          </p>
          <button
            className="w-[210px] cursor-pointer rounded-[14px] border-none bg-coral p-4 text-xl font-extrabold text-white shadow-[0_6px_0_var(--color-coral-dark)] active:translate-y-[3px] active:shadow-[0_3px_0_var(--color-coral-dark)]"
            onClick={onRematch}
          >
            Rematch
          </button>
          <button
            className="cursor-pointer rounded-full border-[1.5px] border-teal bg-transparent px-4 py-2 text-[13px] text-ink"
            onClick={onExit}
          >
            Lobby
          </button>
        </div>
      )}
    </div>
  );
}
