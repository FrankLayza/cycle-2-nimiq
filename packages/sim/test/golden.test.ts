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
      [424242, '06c8baa7c2d36e1eb566513decbd8e5ea3bf5303ff54efb9f11268cd6cbafa43', 'bot', scripted()],
      [20260817, '05868b9f4a90216eba88d6065493ef556523fef6bb253dd57c1d133a6efcbdd8', 'bot', scripted()],
      [7, '6f758f5d9ca384a9e4e5004e2c62ddd4d0f2af36d37e2fcae69c3e0315eb8a2d', 'solo', NOOP],
    ];
    for (const [seed, expected, mode, inputs] of cases) {
      const r = replay(seed, SIM_VERSION, inputs, mode);
      expect(sha256(canonicalResult(r))).toBe(expected);
    }
  });
});
