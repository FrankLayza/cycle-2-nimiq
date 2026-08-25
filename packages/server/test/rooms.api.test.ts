import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { closeDb } from '../src/db/client.js';

let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'snake-rooms-'));
  process.env.DB_PATH = join(tmp, 'rooms.db');
});

afterAll(() => {
  closeDb();
  rmSync(tmp, { recursive: true, force: true });
});

describe('room API capacity', () => {
  it('defaults to four players and clamps requested capacity to two through four', async () => {
    const app = buildApp();
    const defaultRoom = await app.inject({ method: 'POST', url: '/api/v1/rooms', payload: { mode: 'pvp' } });
    const lowRoom = await app.inject({ method: 'POST', url: '/api/v1/rooms', payload: { mode: 'pvp', maxPlayers: 1 } });
    const highRoom = await app.inject({ method: 'POST', url: '/api/v1/rooms', payload: { mode: 'pvp', maxPlayers: 99 } });
    const fractionalRoom = await app.inject({ method: 'POST', url: '/api/v1/rooms', payload: { mode: 'pvp', maxPlayers: 2.5 } });

    expect(defaultRoom.json().maxPlayers).toBe(4);
    expect(lowRoom.json().maxPlayers).toBe(2);
    expect(highRoom.json().maxPlayers).toBe(4);
    expect(fractionalRoom.json().maxPlayers).toBe(4);

    const fetched = await app.inject({ method: 'GET', url: `/api/v1/rooms/${defaultRoom.json().code}` });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().maxPlayers).toBe(4);
    await app.close();
  });
});
