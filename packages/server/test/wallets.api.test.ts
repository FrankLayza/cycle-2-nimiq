import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { closeDb } from '../src/db/client.js';

const ADDRESS = `NQ${'1'.repeat(34)}`;
let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'snake-wallet-'));
  process.env.DB_PATH = join(tmp, 'test.db');
});

afterAll(() => {
  closeDb();
  rmSync(tmp, { recursive: true, force: true });
});

describe('wallet profile API', () => {
  it('registers a normalized wallet profile idempotently', async () => {
    const app = buildApp();
    const first = await app.inject({ method: 'POST', url: '/api/v1/wallet/register', payload: { address: ADDRESS.toLowerCase() } });
    expect(first.statusCode).toBe(200);
    expect(first.json().profile.address).toBe(ADDRESS);
    expect(first.json().profile.streak).toBe(0);

    const second = await app.inject({ method: 'POST', url: '/api/v1/wallet/register', payload: { address: ADDRESS } });
    expect(second.statusCode).toBe(200);
    expect(second.json().profile.created_at).toBe(first.json().profile.created_at);
    await app.close();
  }, 15000);

  it('retrieves a registered profile and rejects invalid addresses', async () => {
    const app = buildApp();
    await app.inject({ method: 'POST', url: '/api/v1/wallet/register', payload: { address: ADDRESS } });
    const found = await app.inject({ method: 'GET', url: `/api/v1/wallet/${ADDRESS}` });
    expect(found.statusCode).toBe(200);
    expect(found.json().profile.address).toBe(ADDRESS);

    const invalid = await app.inject({ method: 'POST', url: '/api/v1/wallet/register', payload: { address: 'not-a-wallet' } });
    expect(invalid.statusCode).toBe(400);
    await app.close();
  });

  it('returns the verified daily leaderboard', async () => {
    const app = buildApp();
    const db = (await import('../src/db/client.js')).getDb();
    db.prepare(`INSERT INTO runs (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`)
      .run('run-1', '2026-08-19', ADDRESS, 1, 1, 'solo', '[]', 'hash-1', 12, 3, Date.now(), '');
    const response = await app.inject({ method: 'GET', url: `/api/v1/leaderboard/today?date=2026-08-19&wallet=${ADDRESS}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().entries[0]).toMatchObject({ rank: 1, wallet: ADDRESS, score: 12 });
    expect(response.json().personal.wallet).toBe(ADDRESS);
    await app.close();
  });
});
