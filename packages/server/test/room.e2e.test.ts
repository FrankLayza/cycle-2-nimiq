import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArraySchema, MapSchema, Schema, defineTypes } from '@colyseus/schema';
import { Client } from 'colyseus.js';
import { startServer } from '../src/index.js';
import { closeDb } from '../src/db/client.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn: () => boolean, timeout = 15000): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('timeout waiting for condition');
    await sleep(50);
  }
}

// Client-side mirror of the server MatchState schema — colyseus.js only decodes
// state patches when a root schema is provided. Uses defineTypes() like the
// server schema so both sides stay in lockstep.
class ClientCell extends Schema {
  x = 0;
  y = 0;
}
class ClientPellet extends Schema {
  x = 0;
  y = 0;
  type = 0;
}
class ClientSnake extends Schema {
  declare seat: number;
  declare sessionId: string;
  declare wallet: string;
  declare isBot: boolean;
  declare cells: ArraySchema<ClientCell>;
  declare score: number;
  declare length: number;
  declare alive: boolean;
  declare boosting: boolean;
  declare color: string;
  constructor() {
    super();
    this.seat = 0;
    this.sessionId = '';
    this.wallet = '';
    this.isBot = false;
    this.cells = new ArraySchema<ClientCell>();
    this.score = 0;
    this.length = 0;
    this.alive = true;
    this.boosting = false;
    this.color = '';
  }
}
class ClientMatchState extends Schema {
  declare roomId: string;
  declare mode: string;
  declare seed: number;
  declare simVersion: number;
  declare tick: number;
  declare status: string;
  declare boundary: number;
  declare nextShrinkTick: number;
  declare countdown: number;
  declare snakes: MapSchema<ClientSnake>;
  declare pellets: ArraySchema<ClientPellet>;
  declare resultJson: string;
  constructor() {
    super();
    this.roomId = '';
    this.mode = 'bot';
    this.seed = 0;
    this.simVersion = 0;
    this.tick = 0;
    this.status = 'lobby';
    this.boundary = 30;
    this.nextShrinkTick = 100;
    this.countdown = 0;
    this.snakes = new MapSchema<ClientSnake>();
    this.pellets = new ArraySchema<ClientPellet>();
    this.resultJson = '';
  }
}

defineTypes(ClientCell, { x: 'number', y: 'number' });
defineTypes(ClientPellet, { x: 'number', y: 'number', type: 'number' });
defineTypes(ClientSnake, {
  seat: 'number',
  sessionId: 'string',
  wallet: 'string',
  isBot: 'boolean',
  cells: [ClientCell],
  score: 'number',
  length: 'number',
  alive: 'boolean',
  boosting: 'boolean',
  color: 'string',
});
defineTypes(ClientMatchState, {
  roomId: 'string',
  mode: 'string',
  seed: 'number',
  simVersion: 'number',
  tick: 'number',
  status: 'string',
  boundary: 'number',
  nextShrinkTick: 'number',
  countdown: 'number',
  snakes: { map: ClientSnake },
  pellets: [ClientPellet],
  resultJson: 'string',
});

interface MatchResultJson {
  mode: string;
  seed: number;
  version: number;
  ticks: number;
  winner: number | null;
  snakes: { id: number; score: number; length: number; alive: boolean }[];
}

let server: Awaited<ReturnType<typeof startServer>>;
let port = 0;
let tmp: string;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'snake-e2e-'));
  process.env.DB_PATH = join(tmp, 'e2e.db');
  server = await startServer(0);
  const addr = server.app.server.address();
  port = typeof addr === 'object' && addr ? addr.port : 8080;
}, 20000);

afterAll(async () => {
  closeDb();
  await server.app.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('MatchRoom e2e (2 Colyseus clients)', () => {
  it('runs a full authoritative PvP match both clients can observe', async () => {
    const c1 = new Client(`ws://localhost:${port}`);
    const c2 = new Client(`ws://localhost:${port}`);
    const room1 = await c1.joinOrCreate('match', { mode: 'pvp', code: 'ABCD', wallet: 'w1' }, ClientMatchState);
    await waitFor(() => room1.state.snakes.size === 1, 2000);
    expect(room1.state.status).toBe('lobby');
    expect(room1.state.snakes.size).toBe(1);

    const room2 = await c2.joinOrCreate('match', { mode: 'pvp', code: 'ABCD', wallet: 'w2' }, ClientMatchState);

    // Both clients seated → countdown → playing (state patches land async).
    await waitFor(() => room1.state.mode === 'pvp' && room1.state.status === 'playing', 15000);
    expect(room1.state.seed).toBe(room2.state.seed);
    await waitFor(() => (room1.state.snakes.get('0')?.cells.length ?? 0) > 0, 2000);
    expect(room1.state.snakes.get('0')?.cells.length).toBeGreaterThan(0);
    expect(room1.state.snakes.get('1')?.cells.length).toBeGreaterThan(0);
    expect([...room1.state.snakes.values()].map((snake) => snake.sessionId)).toEqual(
      expect.arrayContaining([room1.sessionId, room2.sessionId]),
    );
    expect([...room1.state.snakes.values()].every((snake) => snake.cells.length > 0)).toBe(true);
    expect(room1.state.pellets.length).toBeGreaterThan(0);

    // Play ~2.5s of inputs (some turns, some boosts).
    for (let i = 0; i < 20; i++) {
      room1.send('input', { turn: i % 9 === 0 ? 'up' : null, boost: i % 13 === 0 });
      room2.send('input', { turn: i % 7 === 0 ? 'down' : null, boost: i % 11 === 0 });
      await sleep(140);
    }

    // No more inputs — both snakes drive straight until one dies.
    await waitFor(() => room1.state.status === 'finished', 30000);
    expect(room2.state.status).toBe('finished');
    expect(room1.state.tick).toBe(room2.state.tick);
    expect(room1.state.tick).toBeGreaterThan(0);

    const result = JSON.parse(room1.state.resultJson) as MatchResultJson;
    expect(result.ticks).toBe(room1.state.tick);
    expect(result.snakes).toHaveLength(2);
    expect(result.snakes.filter((sn) => sn.alive).length).toBeLessThanOrEqual(1);

    await room1.leave();
    await room2.leave();
  }, 45000);
});
