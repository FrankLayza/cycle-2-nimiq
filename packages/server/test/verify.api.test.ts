import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { replay, SIM_VERSION } from '@snake/sim';
import type { AppliedInput } from '@snake/sim';
import { buildApp } from '../src/app.js';
import { closeDb } from '../src/db/client.js';
import { dailySeed } from '../src/services/seed.js';

const DAY = '2026-08-17';
const WALLET = 'NQ00TEST0000000000000000000000000000000';
const NOOP: AppliedInput[][] = [[]];
let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'snake-verify-'));
  process.env.DB_PATH = join(tmp, 'test.db');
  process.env.SEED_SALT = 'test-salt';
});

afterAll(() => {
  closeDb();
  rmSync(tmp, { recursive: true, force: true });
});

function validPayload(inputs: AppliedInput[][] = NOOP) {
  const seed = dailySeed(DAY, 'test-salt');
  const r = replay(seed, SIM_VERSION, inputs, 'solo');
  const score = r.snakes[0].score + r.snakes[0].length + r.ticks;
  return { day: DAY, seed, simVersion: SIM_VERSION, wallet: WALLET, inputs, reportedScore: score, attestation: 'fake-sig' };
}

/** A different-but-honest run: distinct input log ⇒ distinct log_hash (D29). */
function otherRun(): AppliedInput[][] {
  const log: AppliedInput[] = [];
  for (let t = 1; t <= 100; t++) log.push({ turn: t % 11 === 0 ? 'up' : null, boost: false });
  return [log];
}

describe('POST /api/v1/runs/verify', { timeout: 20000 }, () => {
  it('accepts an honest Today’s Run and returns rank 1', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/runs/verify', payload: validPayload() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.score).toBeGreaterThan(0);
    expect(body.rank).toBe(1);
    expect(body.runId).toBeTruthy();
    await app.close();
  });

  it('rejects a duplicate input log (D29 log-copy rejection)', async () => {
    const app = buildApp();
    const payload = validPayload(otherRun()); // distinct log from the honest test above
    const first = await app.inject({ method: 'POST', url: '/api/v1/runs/verify', payload });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: 'POST', url: '/api/v1/runs/verify', payload });
    expect(second.statusCode).toBe(409);
    expect(second.json().reason).toMatch(/duplicate/);
    await app.close();
  });

  it('rejects tampered inputs (score mismatch)', async () => {
    const app = buildApp();
    const payload = validPayload();
    payload.inputs = [[{ turn: 'up', boost: false }]];
    const res = await app.inject({ method: 'POST', url: '/api/v1/runs/verify', payload });
    expect(res.statusCode).toBe(422);
    expect(res.json().valid).toBe(false);
    await app.close();
  });

  it('rejects a seed that does not match the day', async () => {
    const app = buildApp();
    const payload = validPayload();
    payload.seed = dailySeed('2026-08-18', 'test-salt');
    const res = await app.inject({ method: 'POST', url: '/api/v1/runs/verify', payload });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/seed/);
    await app.close();
  });

  it('rejects a missing attestation (D34)', async () => {
    const app = buildApp();
    const payload = validPayload();
    delete (payload as { attestation?: string }).attestation;
    const res = await app.inject({ method: 'POST', url: '/api/v1/runs/verify', payload });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/attestation/);
    await app.close();
  });
});
