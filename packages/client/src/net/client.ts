import { ArraySchema, MapSchema, Schema, defineTypes } from '@colyseus/schema';
import { Client, Room } from 'colyseus.js';

export class ClientCell extends Schema {
  declare x: number;
  declare y: number;

  constructor() {
    super();
    this.x = 0;
    this.y = 0;
  }
}

export class ClientPellet extends Schema {
  declare x: number;
  declare y: number;
  declare type: number;

  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.type = 0;
  }
}

export class ClientSnake extends Schema {
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

export class ClientMatchState extends Schema {
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

export type RoomCode = string;
export function normalizeRoomCode(value: string): RoomCode {
  return value.toUpperCase().replace(/[^0-9A-HJ-KM-NP-TV-Z]/g, '').slice(0, 4);
}

/**
 * Colyseus client factory. W1: bot matches run locally (spike path) — this
 * exists for the W2 room-code PvP wiring (joinOrCreate('match', { mode, code })).
 * In the Nimiq Pay WebView the WS URL is the app origin (same-origin, no CORS).
 */
export function createMatchClient(wsUrl = '/colyseus'): Client {
  return new Client(wsUrl);
}

export function joinPvp(client: Client, code: RoomCode, wallet?: string): Promise<Room<ClientMatchState>> {
  return client.joinOrCreate<ClientMatchState>('match', { mode: 'pvp', code: normalizeRoomCode(code), wallet }, ClientMatchState);
}
