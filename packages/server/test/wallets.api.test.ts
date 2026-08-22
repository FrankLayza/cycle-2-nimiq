import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { closeDb } from '../src/db/client.js';
import { KeyPair, PrivateKey } from '@nimiq/core';

const ADDRESS = KeyPair.derive(new PrivateKey(new Uint8Array(32).fill(11))).toAddress().toUserFriendlyAddress();
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

  it('keeps score and length from the same best run', async () => {
    const app = buildApp();
    const db = (await import('../src/db/client.js')).getDb();
    db.prepare(`INSERT INTO runs (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`)
      .run('run-high-score', '2026-08-20', ADDRESS, 1, 1, 'solo', '[]', 'hash-high', 20, 3, Date.now(), '');
    db.prepare(`INSERT INTO runs (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`)
      .run('run-longer', '2026-08-20', ADDRESS, 1, 1, 'solo', '[]', 'hash-long', 12, 9, Date.now(), '');
    const response = await app.inject({ method: 'GET', url: `/api/v1/leaderboard/today?date=2026-08-20&wallet=${ADDRESS}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().entries[0]).toMatchObject({ score: 20, length: 3 });
    expect(response.json().personal).toMatchObject({ rank: 1, score: 20, length: 3 });
    await app.close();
  });

  it('returns streak state and the seven-day badge', async () => {
    const app = buildApp();
    const db = (await import('../src/db/client.js')).getDb();
    db.prepare('INSERT INTO wallets (address, created_at, streak, last_play_date, last_run_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(address) DO UPDATE SET streak = excluded.streak, last_play_date = excluded.last_play_date, last_run_at = excluded.last_run_at')
      .run(ADDRESS, Date.now(), 7, '2026-08-22', Date.now());
    db.prepare(`INSERT INTO runs (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`)
      .run('streak-best', '2026-08-22', ADDRESS, 1, 1, 'solo', '[]', 'streak-best', 42, 4, Date.now(), '');
    const response = await app.inject({ method: 'GET', url: `/api/v1/streaks/${ADDRESS.toLowerCase()}` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ streak: 7, bestScore: 42, lastPlayDate: '2026-08-22', badge: '7-day-streak' });
    await app.close();
  });

  it('returns 404 for an unregistered streak wallet', async () => {
    const app = buildApp();
    const other = KeyPair.derive(new PrivateKey(new Uint8Array(32).fill(12))).toAddress().toUserFriendlyAddress();
    const response = await app.inject({ method: 'GET', url: `/api/v1/streaks/${other}` });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
