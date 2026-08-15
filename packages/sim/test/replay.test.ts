import { describe, expect, it } from 'vitest';
import { replay, SIM_VERSION, todayScore, verifyRun } from '../src/index.js';
import type { AppliedInput, RunRecord } from '../src/index.js';

function soloRecord(seed: number, inputs: AppliedInput[][], overrides: Partial<RunRecord> = {}): RunRecord {
  const r = replay(seed, SIM_VERSION, inputs, 'solo');
  const sn = r.snakes[0];
  const score = sn.score + sn.length + r.ticks;
  return {
    id: 'run-1',
    day: '2026-08-17',
    wallet: 'NQ00TEST0000000000000000000000000000000',
    seed,
    simVersion: SIM_VERSION,
    mode: 'solo',
    inputs,
    reportedScore: score,
    logHash: 'fake-hash',
    attestedAt: Date.now(),
    ...overrides,
  };
}

const NOOP: AppliedInput[][] = [[]];

describe('replay verification', () => {
  it('verifyRun agrees on an honest run', () => {
    const record = soloRecord(20260817, NOOP);
    const res = verifyRun(record);
    expect(res.valid).toBe(true);
    expect(res.score).toBe(record.reportedScore);
  });

  it('verifyRun rejects tampered inputs (score mismatch)', () => {
    const honest = replay(20260817, SIM_VERSION, NOOP, 'solo');
    const score = honest.snakes[0].score + honest.snakes[0].length + honest.ticks;
    // Tamper: insert a turn that was never made.
    const tampered: AppliedInput[][] = [[{ turn: 'up', boost: false }]];
    const record = soloRecord(20260817, tampered, { reportedScore: score });
    const res = verifyRun(record);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/mismatch/);
  });

  it('verifyRun rejects a wrong reported score', () => {
    const record = soloRecord(20260817, NOOP, { reportedScore: 999999 });
    const res = verifyRun(record);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/score mismatch/);
  });

  it('verifyRun rejects SIM_VERSION mismatch', () => {
    const record = soloRecord(20260817, NOOP, { simVersion: SIM_VERSION + 1 });
    const res = verifyRun(record);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/SIM_VERSION/);
  });

  it('todayScore is stable across calls', () => {
    expect(todayScore(7, SIM_VERSION, NOOP)).toBe(todayScore(7, SIM_VERSION, NOOP));
    expect(todayScore(7, SIM_VERSION, NOOP)).toBeGreaterThan(0);
  });
});
