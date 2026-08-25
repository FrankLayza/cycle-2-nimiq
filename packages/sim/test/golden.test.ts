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
      [424242, 'aa37503f4572e4df751fdf2e89ab42b6c25000b5a3ac6d02630cd20fe89a05bc', 'bot', scripted()],
      [20260817, 'ed74d35295ad82f4390cc4abb5d21cf58563ccb6e7c32b648afa165bae006b02', 'bot', scripted()],
      [7, '08fdb1b28dbba0be3b052d8f3ed26e74b692d10d1fd5d1d5c2603604cd8b2dda', 'solo', NOOP],
    ];
    for (const [seed, expected, mode, inputs] of cases) {
      const r = replay(seed, SIM_VERSION, inputs, mode);
      expect(sha256(canonicalResult(r))).toBe(expected);
    }
  });
});
