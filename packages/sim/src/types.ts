export type Dir = 'up' | 'down' | 'left' | 'right';

/** solo = Today's Run (single seeded snake, D28) · bot = free-play vs AI · pvp = room-code PvP */
export type Mode = 'solo' | 'bot' | 'pvp';

export interface Vec {
  x: number;
  y: number;
}

export interface Cell {
  x: number;
  y: number;
}

/** 0 = normal pellet (+1 length, +1 score) · 1 = bounty (+3 length, +3 score, expires). */
export type PelletType = 0 | 1;

export interface Pellet {
  x: number;
  y: number;
  type: PelletType;
  age: number;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One tick's applied input for one seat — the authoritative verification log entry (D27). */
export interface AppliedInput {
  turn: Dir | null;
  boost: boolean;
}

export interface SnakeState {
  id: number;
  cells: Cell[]; // head first
  dir: Vec;
  boost: boolean;
  score: number; // pellet points
  alive: boolean;
  pendingGrow: number;
  lastTurnTick: number; // momentum tie-break for equal-length head-ons
  boostBurn: number; // accumulates toward the per-second tail burn
}

/** The arena is pre-derived from the seed (D28) so every player faces identical conditions. */
export interface Arena {
  seed: number;
  shrinkTicks: number[]; // ticks at which the boundary contracts
  initialNormal: Cell[]; // normal pellets present at tick 0
  initialBounty: Cell | null; // bounty pellet present at tick 0
  normalSpawns: Cell[]; // pre-drawn normal pellet spawn candidates
  bountySpawns: Cell[]; // pre-drawn bounty pellet spawn candidates
}

export interface GameState {
  seed: number;
  version: number;
  mode: Mode;
  tick: number;
  bounds: Bounds;
  pellets: Pellet[];
  snakes: SnakeState[];
  normalIdx: number; // next arena.normalSpawns candidate
  bountyIdx: number; // next arena.bountySpawns candidate
  arena: Arena; // derived once at createRun — never mutated after
}

export interface SnakeResult {
  id: number;
  score: number;
  length: number;
  alive: boolean;
}

export interface MatchResult {
  mode: Mode;
  seed: number;
  version: number;
  ticks: number;
  winner: number | null; // seat id; null = draw / no contest
  snakes: SnakeResult[];
  inputLog: AppliedInput[][]; // applied inputs per tick, per seat (authoritative log)
}

/** A submitted run — what replay verification consumes (server adds log_hash + attestation). */
export interface RunRecord {
  id: string;
  day: string; // YYYY-MM-DD (UTC)
  wallet: string; // Nimiq address
  seed: number;
  simVersion: number;
  mode: Mode;
  inputs: AppliedInput[][];
  reportedScore: number;
  logHash: string; // server-computed (node:crypto) — UNIQUE(day, log_hash) dedupe (D29)
  attestedAt: number; // epoch ms
  attestation?: string; // signed message (D34) — verified server-side, not in the sim
}
