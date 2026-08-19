import { ArraySchema, MapSchema, Schema, defineTypes } from '@colyseus/schema';

/**
 * Patch-synced state schema (~9 Hz). Defined via defineTypes() (decorator-free)
 * so it works identically under any TS/esbuild decorator config.
 *
 * IMPORTANT: collection fields (snakes/pellets) are assigned in the
 * constructor, NOT via field initializers — assignments route through the
 * schema accessors which set the collection's $childType metadata.
 */

export class CellState extends Schema {
  x = 0;
  y = 0;
}

export class PelletState extends Schema {
  x = 0;
  y = 0;
  type = 0;
}

export class SnakeState extends Schema {
  declare seat: number;
  declare sessionId: string;
  declare wallet: string;
  declare isBot: boolean;
  declare cells: ArraySchema<CellState>;
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
    this.cells = new ArraySchema<CellState>();
    this.score = 0;
    this.length = 0;
    this.alive = true;
    this.boosting = false;
    this.color = '#3ddc84';
  }
}

export type MatchMode = 'bot' | 'pvp' | 'staked-testnet';
export type MatchStatus = 'lobby' | 'countdown' | 'playing' | 'finished';

export class MatchState extends Schema {
  declare roomId: string;
  declare mode: MatchMode;
  declare seed: number;
  declare simVersion: number;
  declare tick: number;
  declare status: MatchStatus;
  declare boundary: number;
  declare nextShrinkTick: number;
  declare countdown: number;
  declare snakes: MapSchema<SnakeState>;
  declare pellets: ArraySchema<PelletState>;
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
    this.snakes = new MapSchema<SnakeState>();
    this.pellets = new ArraySchema<PelletState>();
    this.resultJson = '';
  }
}

defineTypes(CellState, { x: 'number', y: 'number' });
defineTypes(PelletState, { x: 'number', y: 'number', type: 'number' });
defineTypes(SnakeState, {
  seat: 'number',
  sessionId: 'string',
  wallet: 'string',
  isBot: 'boolean',
  cells: [CellState],
  score: 'number',
  length: 'number',
  alive: 'boolean',
  boosting: 'boolean',
  color: 'string',
});
defineTypes(MatchState, {
  roomId: 'string',
  mode: 'string',
  seed: 'number',
  simVersion: 'number',
  tick: 'number',
  status: 'string',
  boundary: 'number',
  nextShrinkTick: 'number',
  countdown: 'number',
  snakes: { map: SnakeState },
  pellets: [PelletState],
  resultJson: 'string',
});
