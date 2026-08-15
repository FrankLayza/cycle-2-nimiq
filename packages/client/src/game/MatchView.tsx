import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import { MatchScene } from './MatchScene';
import { swipeToDir } from './input';

interface Props {
  onExit: () => void;
  onRematch: () => void;
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
export function MatchView({ onExit, onRematch }: Props) {
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
    let running = true;

    const interval = setInterval(() => {
      if (!running) return;
      const a = pendingRef.current;
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
    <div className="match">
      <div id="world">
        <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
        <div className="hud">
          <span className="you">
            YOU <b>{hud.you}</b>
          </span>
          <span>
            ⚔ {hud.alive} · shrink <b>{hud.boundary}</b>
          </span>
          <span>seed {hud.seed}</span>
        </div>
        <div className="controls">
          <div className="pad">
            <button className="up" onPointerDown={() => setTurn('up')}>
              ▲
            </button>
            <button className="left" onPointerDown={() => setTurn('left')}>
              ◀
            </button>
            <button className="down" onPointerDown={() => setTurn('down')}>
              ▼
            </button>
            <button className="right" onPointerDown={() => setTurn('right')}>
              ▶
            </button>
          </div>
          <div className="hint">{hud.boosting ? 'BOOSTING — burning tail!' : 'hold BOOST to speed up!'}</div>
          <button
            className="boost"
            onPointerDown={() => setBoost(true)}
            onPointerUp={() => setBoost(false)}
            onPointerLeave={() => setBoost(false)}
          >
            BOOST
          </button>
        </div>
      </div>
      {result && (
        <div className="result-card">
          <h2>
            {result.winner === 0 ? '🏆 You win!' : result.winner === 1 ? '🤖 Bot wins.' : '💀 Draw'}
          </h2>
          <p>
            Score {result.you.score} · Length {result.you.length}
          </p>
          <button className="btn-play" onClick={onRematch}>
            Rematch
          </button>
          <button className="btn-ghost" onClick={onExit}>
            Lobby
          </button>
        </div>
      )}
    </div>
  );
}
