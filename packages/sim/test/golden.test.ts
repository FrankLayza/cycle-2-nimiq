import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { replay, SIM_VERSION } from '../src/index.js';
import type { AppliedInput, Dir, MatchResult, Mode } from '../src/index.js';

/**
 * Canonical fingerprint of a match's final state (D31): seed, version, mode,
 * ticks, winner, and each snake's score / length / alive. Any sim rule change
 * breaks the pinned hashes below and forces a conscious SIM_VERSION bump.
 */
export function canonicalResult(r: MatchResult): string {
  return JSON.stringify({
    seed: r.seed,
    version: r.version,
    mode: r.mode,
    ticks: r.ticks,
    winner: r.winner,
    snakes: r.snakes.map((s) => [s.id, s.score, s.length, s.alive]),
  });
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

const NOOP: AppliedInput[][] = [[]];

function scripted(): AppliedInput[][] {
  const turnAt: Record<number, Dir> = { 10: 'up', 20: 'right', 30: 'down', 40: 'left', 50: 'up', 60: 'right', 70: 'down', 80: 'left' };
  const log: AppliedInput[] = [];
  for (let t = 1; t <= 300; t++) log.push({ turn: turnAt[t] ?? null, boost: t % 45 === 0 });
  return [log];
}

describe('golden regression lock (D31)', () => {
  it('fixed seeds + fixed inputs produce pinned final-state hashes', () => {
    const cases: [number, string, Mode, AppliedInput[][]][] = [
      [424242, '2325b82791e7ac02b44e416fcb0e2b26dcb9e3b4689a6ef7f555acab38f1b7e9', 'bot', scripted()],
      [20260817, 'a7c86f9b2ed3c977475478608ba3351684168b36fd35b82e11ba25718c296aea', 'bot', scripted()],
      [7, 'a1a29e05193e03e403d3b83c9f855db79e2cdca308b824b45c77186f5044bf7e', 'solo', NOOP],
    ];
    for (const [seed, expected, mode, inputs] of cases) {
      const r = replay(seed, SIM_VERSION, inputs, mode);
      expect(sha256(canonicalResult(r))).toBe(expected);
    }
  });
});
