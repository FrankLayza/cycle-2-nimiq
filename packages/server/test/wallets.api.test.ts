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
    expect(response.json().entries[0]).toEqual({ rank: 1, score: 12, length: 3, maskedWallet: `${ADDRESS.replace(/\s+/g, '').slice(0, 4)}...${ADDRESS.replace(/\s+/g, '').slice(-4)}`, verified: true, isYou: true });
    expect(response.json().entries[0]).not.toHaveProperty('wallet');
    expect(response.json().personal.wallet).toBe(ADDRESS);
    expect(response.json().totalRuns).toBe(1);
    expect(response.json()).toMatchObject({ page: 1, pageSize: 100 });
    await app.close();
  });

  it('supports the documented daily leaderboard route and validates pagination', async () => {
    const app = buildApp();
    const daily = await app.inject({ method: 'GET', url: '/api/v1/leaderboard/daily?date=2026-08-19&page=1' });
    expect(daily.statusCode).toBe(200);
    const invalidPage = await app.inject({ method: 'GET', url: '/api/v1/leaderboard/daily?page=0' });
    expect(invalidPage.statusCode).toBe(400);
    await app.close();
  });

  it('keeps equal-score rank ordering deterministic', async () => {
    const app = buildApp();
    const db = (await import('../src/db/client.js')).getDb();
    const other = KeyPair.derive(new PrivateKey(new Uint8Array(32).fill(13))).toAddress().toUserFriendlyAddress();
    for (const [id, wallet, length] of [['tie-a', ADDRESS, 3], ['tie-b', other, 2] as const]) {
      db.prepare(`INSERT INTO runs (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`)
        .run(id, '2026-08-21', wallet, 1, 1, 'solo', '[]', id, 12, length, Date.now(), '');
    }
    const response = await app.inject({ method: 'GET', url: '/api/v1/leaderboard/daily?date=2026-08-21' });
    expect(response.statusCode).toBe(200);
    expect(response.json().entries.map((entry: { wallet?: string; rank: number }) => entry.rank)).toEqual([1, 2]);
    expect(response.json().entries[0]).toMatchObject({ score: 12, length: 3 });
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
