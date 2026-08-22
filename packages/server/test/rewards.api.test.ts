import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { closeDb } from '../src/db/client.js';

let tempDir: string;
beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'snake-rewards-api-'));
  process.env.DB_PATH = join(tempDir, 'test.db');
  process.env.REWARD_POOL_NIM = '1000';
});
afterAll(() => { closeDb(); rmSync(tempDir, { recursive: true, force: true }); });

describe('rewards schedule API', () => {
  it('publishes the configured pool size and reward rules', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/v1/rewards/schedule' });
    expect(response.statusCode).toBe(200);
    expect(response.json().poolSizeNim).toBe(1000);
    expect(response.json().daily[0]).toEqual({ rank: 1, nim: 30 });
    await app.close();
  });
});
