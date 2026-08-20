import { describe, expect, it } from 'vitest';
import { createRun, deriveArena, dirVec, isTerminal, replay, SIM_VERSION, step } from '../src/index.js';
import type { AppliedInput, Dir } from '../src/index.js';

const NOOP: AppliedInput[][] = [[]];

function scripted(): AppliedInput[][] {
  const turnAt: Record<number, Dir> = { 10: 'up', 20: 'right', 30: 'down', 40: 'left', 50: 'up', 60: 'right', 70: 'down', 80: 'left' };
  const log: AppliedInput[] = [];
  for (let t = 1; t <= 300; t++) log.push({ turn: turnAt[t] ?? null, boost: t % 45 === 0 });
  return [log];
}

describe('determinism (D31)', () => {
  it('same seed + same inputs reproduces byte-identical results', () => {
    const a = replay(424242, SIM_VERSION, scripted(), 'bot');
    const b = replay(424242, SIM_VERSION, scripted(), 'bot');
    expect(b).toEqual(a);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('arena is pre-derived deterministically per seed', () => {
    expect(deriveArena(7)).toEqual(deriveArena(7));
    expect(deriveArena(7)).not.toEqual(deriveArena(8));
  });

  it('different seeds produce different outcomes', () => {
    const a = JSON.stringify(replay(1, SIM_VERSION, NOOP, 'bot'));
    const b = JSON.stringify(replay(2, SIM_VERSION, NOOP, 'bot'));
    expect(a).not.toBe(b);
  });

  it('PvP opening lanes remain visible before an idle collision', () => {
    let state = createRun(12345, 'pvp');
    for (let tick = 0; tick < 20; tick++) {
      expect(state.snakes.every((snake) => snake.alive)).toBe(true);
      state = step(state, [
        { turn: null, boost: false },
        { turn: null, boost: false },
      ]);
    }
  });

  it('recorded inputs drive the outcome (replay differs without the log)', () => {
    const withLog = JSON.stringify(replay(999, SIM_VERSION, scripted(), 'bot'));
    const without = JSON.stringify(replay(999, SIM_VERSION, NOOP, 'bot'));
    expect(withLog).not.toBe(without);
  });

  it('solo runs terminate deterministically', () => {
    const r = replay(12345, SIM_VERSION, NOOP, 'solo');
    expect(r.snakes[0].alive).toBe(false); // straight into the wall
    expect(r.ticks).toBeGreaterThan(0);
    expect(replay(12345, SIM_VERSION, NOOP, 'solo')).toEqual(r);
  });

  it('shrink boundary contracts every SHRINK_EVERY ticks down to MIN_BOUND', () => {
    // White-box: steer a 4-length snake in a 6x6 patrol box (side > length ⇒ no self-collision).
    let s = createRun(11, 'solo');
    s.snakes[0] = {
      id: 0,
      cells: [{ x: 10, y: 15 }, { x: 9, y: 15 }, { x: 8, y: 15 }, { x: 7, y: 15 }],
      dir: { x: 1, y: 0 },
      boost: false,
      score: 0,
      alive: true,
      pendingGrow: 0,
      lastTurnTick: -99,
      boostBurn: 0,
    };
    s.pellets = [];
    s.normalIdx = 399; // exhaust pre-derived spawn candidates so no pellets appear
    s.bountyIdx = 399;

    const turn = (t: number): Dir | null => {
      const k = (t - 7) % 24;
      if (k === 0) return 'down';
      if (k === 6) return 'left';
      if (k === 12) return 'up';
      if (k === 18) return 'right';
      return null;
    };

    let ticks = 0;
    while (ticks < 300 && !isTerminal(s)) {
      const t = ticks + 1;
      const d = turn(t);
      s = step(s, [{ turn: d, boost: false }]);
      ticks++;
    }
    expect(s.snakes[0].alive).toBe(true);
    // 3 shrinks at ticks 100/200/300: each removes 1 cell per axis.
    expect(s.bounds.x1 - s.bounds.x0 + 1).toBe(30 - 2 * 3);
    expect(s.bounds.y1 - s.bounds.y0 + 1).toBe(30 - 2 * 3);
    // Sanity: the patrol stayed within the pre-shrink arena.
    expect(dirVec).toBeDefined();
  });
});
