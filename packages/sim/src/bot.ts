import { RngContext, rngFor } from './rng.js';
import type { AppliedInput, Dir, GameState, Vec } from './types.js';

/**
 * Deterministic bot policy (ported from spike): greedy toward the nearest
 * pellet with wall / body / opponent-head-zone penalties and a seeded tie-break
 * drawn from the Bot RNG context. Only ever used in free-play `bot`/`pvp`
 * modes (D5) — rewarded modes never contain a bot (D28).
 */
export function botPolicy(state: GameState, seat: number): AppliedInput {
  const rng = rngFor(state.seed, state.tick, RngContext.Bot);
  const me = state.snakes[seat];
  if (!me || !me.alive) return { turn: null, boost: false };
  const opp = state.snakes[1 - seat];
  const head = me.cells[0];

  // Nearest pellet target (Manhattan distance).
  let target: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const p of state.pellets) {
    const d = Math.abs(p.x - head.x) + Math.abs(p.y - head.y);
    if (d < bestD) {
      bestD = d;
      target = p;
    }
  }

  const oppBody = new Set<string>();
  for (const sn of state.snakes) {
    if (sn.id !== me.id && sn.alive) for (const c of sn.cells) oppBody.add(c.x + ',' + c.y);
  }
  const myBody = new Set<string>();
  for (let i = 1; i < me.cells.length; i++) myBody.add(me.cells[i].x + ',' + me.cells[i].y);

  const inBounds = (x: number, y: number) =>
    x >= state.bounds.x0 && x <= state.bounds.x1 && y >= state.bounds.y0 && y <= state.bounds.y1;

  const opts: { dir: Dir; v: Vec }[] = [
    { dir: 'up', v: { x: 0, y: -1 } },
    { dir: 'down', v: { x: 0, y: 1 } },
    { dir: 'left', v: { x: -1, y: 0 } },
    { dir: 'right', v: { x: 1, y: 0 } },
  ];

  let best: { dir: Dir; v: Vec } | null = null;
  let bestScore = -Infinity;
  for (const d of opts) {
    if (d.v.x === -me.dir.x && d.v.y === -me.dir.y) continue; // no reversing
    const nx = head.x + d.v.x;
    const ny = head.y + d.v.y;
    let sc = rng() * 0.5; // seeded tie-break
    if (!inBounds(nx, ny)) sc -= 100;
    else {
      if (myBody.has(nx + ',' + ny)) sc -= 80;
      if (oppBody.has(nx + ',' + ny)) sc -= 90;
      if (target) sc -= (Math.abs(nx - target.x) + Math.abs(ny - target.y)) * 1.2;
      if (opp && opp.alive) {
        const od = Math.abs(nx - opp.cells[0].x) + Math.abs(ny - opp.cells[0].y);
        if (od <= 2) sc -= 6; // slight caution near the opponent's head zone
      }
    }
    if (sc > bestScore) {
      bestScore = sc;
      best = d;
    }
  }

  const boost = me.boost ? true : Boolean(target && me.cells.length > 4 && bestD < 8);
  return { turn: best ? best.dir : null, boost };
}
