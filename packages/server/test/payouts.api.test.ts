import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { closeDb, getDb } from '../src/db/client.js';

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'snake-payout-api-'));
  process.env.DB_PATH = join(tempDir, 'test.db');
});

afterAll(() => {
  closeDb();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('payout status API', () => {
  it('returns a payout by run id', async () => {
    const app = buildApp();
    getDb().prepare(
      'INSERT INTO payouts (id, run_id, wallet, amount_nim, status, tx_hash, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('daily:test-run', 'test-run', 'NQ00 TEST', 30, 'sent', 'tx-test', 123);
    const response = await app.inject({ method: 'GET', url: '/api/v1/payouts/test-run' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      runId: 'test-run',
      wallet: 'NQ00 TEST',
      amountNim: 30,
      status: 'sent',
      txHash: 'tx-test',
      paidAt: 123,
      attemptedAt: null,
      explorerUrl: 'https://test-nimiq.watch/#/tx/tx-test',
    });
    await app.close();
  });

  it('returns 404 for an unknown run', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/v1/payouts/missing' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('rejects an invalid settlement day before signer setup', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/payouts/daily?day=2026-02-30',
      headers: { 'x-admin-token': 'dev-admin-token' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/valid non-future UTC date/);
    await app.close();
  });
});
