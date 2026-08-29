import { BOOST_SUBSTEPS, BOOST_TICKS, BOUNTY_EVERY, BOUNTY_MAX_AGE, GRID_SIZE, MAX_TICKS, MIN_BOUND, NORMAL_COUNT, SHRINK_EVERY } from './config.js';
import { SIM_VERSION } from './version.js';
import { SPAWNS, deriveArena } from './arena.js';
import type { AppliedInput, Bounds, Cell, Dir, GameState, Mode, Pellet, PelletType, SnakeState, Vec } from './types.js';

export function dirVec(d: Dir): Vec {
  switch (d) {
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

function inBounds(b: Bounds, x: number, y: number): boolean {
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

/**
 * Create a fresh run. `solo` = one seeded snake (Today's Run, D28), `bot` =
 * two snakes, and `pvp` = two to four active players. The arena is
 * pre-derived from the seed (D28/D31).
 */
export function createRun(seed: number, mode: Mode, version: number = SIM_VERSION, playerCount?: number): GameState {
  if (version !== SIM_VERSION) {
    throw new Error(`SIM_VERSION mismatch: got ${version}, expected ${SIM_VERSION}`);
  }
  const arena = deriveArena(seed);
  const count = mode === 'solo' ? 1 : mode === 'bot' ? 2 : Math.max(2, Math.min(4, Math.trunc(playerCount ?? 4)));
  const seatIds = Array.from({ length: count }, (_, id) => id);
  const snakes: SnakeState[] = seatIds.map((id) => {
    const spawn = SPAWNS[id];
    return {
      id,
      cells: spawn.cells.map((c) => ({ ...c })),
      dir: { ...spawn.dir },
      boost: false,
      score: 0,
      alive: true,
      pendingGrow: 0,
      lastTurnTick: -99,
      boostBurn: 0,
    };
  });
  const pellets: Pellet[] = [];
  for (const c of arena.initialNormal) pellets.push({ x: c.x, y: c.y, type: 0, age: 0 });
  if (arena.initialBounty) pellets.push({ x: arena.initialBounty.x, y: arena.initialBounty.y, type: 1, age: 0 });
  return {
    seed,
    version,
    mode,
    tick: 0,
    bounds: { x0: 0, y0: 0, x1: GRID_SIZE - 1, y1: GRID_SIZE - 1 },
    pellets,
    snakes,
    playerCount: count,
    normalIdx: 0,
    bountyIdx: 0,
    arena,
  };
}

function placePellet(
  pellets: Pellet[],
  c: Cell,
  type: PelletType,
  snakes: SnakeState[],
  b: Bounds,
): void {
  const free = (x: number, y: number) =>
    inBounds(b, x, y) &&
    !pellets.some((p) => p.x === x && p.y === y) &&
    !snakes.some((sn) => sn.alive && sn.cells.some((cell) => cell.x === x && cell.y === y));
  if (free(c.x, c.y)) {
    pellets.push({ x: c.x, y: c.y, type, age: 0 });
    return;
  }
  // Candidate occupied mid-game (snake/pellet moved onto it) — deterministic
  // outward spiral scan for the nearest free cell. Pure function of seed + history.
  for (let r = 1; r <= GRID_SIZE; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = c.x + dx;
        const y = c.y + dy;
        if (free(x, y)) {
          pellets.push({ x, y, type, age: 0 });
          return;
        }
      }
    }
  }
  // No free cell — skip this spawn (arena is full).
}

/**
 * Advance the sim by one tick. Pure: returns a new state, never mutates the
 * input. `inputs[seat]` is that seat's action for this tick; bot seats must be
 * fed by `botPolicy` by the caller (room / replay do this identically).
 */
export function step(state: GameState, inputs: AppliedInput[]): GameState {
  const arena = state.arena;
  const tick = state.tick + 1;
  const snakes = state.snakes.map((sn) => ({
    ...sn,
    cells: sn.cells.map((c) => ({ ...c })),
    dir: { ...sn.dir },
  }));
  const b = state.bounds;
  const inB = (x: number, y: number) => inBounds(b, x, y);

  // 1. Apply inputs (boost flag + turn, no reversing).
  for (let i = 0; i < snakes.length; i++) {
    const sn = snakes[i];
    const a = inputs[i] ?? { turn: null, boost: false };
    if (!sn.alive) continue;
    if (a.forfeit) {
      sn.alive = false;
      sn.boost = false;
      continue;
    }
    sn.boost = a.boost;
    if (a.turn) {
      const d = dirVec(a.turn);
      if (!(d.x === -sn.dir.x && d.y === -sn.dir.y)) {
        sn.dir = d;
        sn.lastTurnTick = tick;
      }
    }
  }

  // 2. Move (boost = 2 sub-steps). Walls are fatal.
  for (const sn of snakes) {
    if (!sn.alive) continue;
    if (sn.dir.x === 0 && sn.dir.y === 0) continue;
    const steps = sn.boost ? BOOST_SUBSTEPS : 1;
    for (let k = 0; k < steps; k++) {
      const h = sn.cells[0];
      const nx = h.x + sn.dir.x;
      const ny = h.y + sn.dir.y;
      if (!inB(nx, ny)) {
        sn.alive = false;
        break;
      }
      sn.cells.unshift({ x: nx, y: ny });
      if (sn.pendingGrow > 0) sn.pendingGrow--;
      else sn.cells.pop();
    }
    // Boost burns 1 tail segment per second.
    if (sn.boost) {
      sn.boostBurn++;
      if (sn.boostBurn >= BOOST_TICKS) {
        sn.boostBurn = 0;
        if (sn.cells.length > 1) sn.cells.pop();
      }
    }
  }

  const pellets = state.pellets.map((p) => ({ ...p }));

  // 3. Eating.
  for (const sn of snakes) {
    if (!sn.alive) continue;
    const h = sn.cells[0];
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      if (p.x === h.x && p.y === h.y) {
        if (p.type === 1) {
          sn.pendingGrow += 3;
          sn.score += 3;
        } else {
          sn.pendingGrow += 1;
          sn.score += 1;
        }
        pellets.splice(i, 1);
      }
    }
  }

  // 4. Collisions (server-authoritative rules, ported from spike).
  //    Head-on: longer survives; equal → most recent turner loses; never-turned tie → both die.
  const headGroups = new Map<string, SnakeState[]>();
  for (const sn of snakes) {
    if (!sn.alive) continue;
    const h = sn.cells[0];
    const key = `${h.x},${h.y}`;
    const group = headGroups.get(key);
    if (group) group.push(sn);
    else headGroups.set(key, [sn]);
  }
  for (const group of headGroups.values()) {
    if (group.length < 2) continue;
    const longest = Math.max(...group.map((sn) => sn.cells.length));
    const contenders = group.filter((sn) => sn.cells.length === longest);
    if (contenders.length === 1) {
      for (const sn of group) if (sn !== contenders[0]) sn.alive = false;
      continue;
    }
    const oldestTurn = Math.min(...contenders.map((sn) => sn.lastTurnTick));
    const oldest = contenders.filter((sn) => sn.lastTurnTick === oldestTurn);
    if (oldest.length === 1) {
      for (const sn of group) if (sn !== oldest[0]) sn.alive = false;
    } else {
      for (const sn of group) sn.alive = false;
    }
  }
  //    Head vs body: attacker dies, defender gains +3.
  for (const sn of snakes) {
    if (!sn.alive) continue;
    const h = sn.cells[0];
    for (const other of snakes) {
      if (other === sn || !other.alive) continue;
      for (const c of other.cells) {
        if (c.x === h.x && c.y === h.y) {
          sn.alive = false;
          other.pendingGrow += 3;
          other.score += 3;
          break;
        }
      }
      if (!sn.alive) break;
    }
  }
  //    Self-collision.
  for (const sn of snakes) {
    if (!sn.alive) continue;
    const h = sn.cells[0];
    for (let i = 1; i < sn.cells.length; i++) {
      if (sn.cells[i].x === h.x && sn.cells[i].y === h.y) {
        sn.alive = false;
        break;
      }
    }
  }

  // 5. Pellets: age, expire bounties, refill from the pre-derived arena schedule.
  for (const p of pellets) p.age++;
  const kept = pellets.filter((p) => !(p.type === 1 && p.age > BOUNTY_MAX_AGE));
  let normalIdx = state.normalIdx;
  let bountyIdx = state.bountyIdx;
  let normalCount = 0;
  for (const p of kept) if (p.type === 0) normalCount++;
  for (let i = normalCount; i < NORMAL_COUNT; i++) {
    const c = arena.normalSpawns[normalIdx++];
    if (c) placePellet(kept, c, 0, snakes, b);
  }
  let bountyCount = 0;
  for (const p of kept) if (p.type === 1) bountyCount++;
  if (bountyCount < 1 && tick % BOUNTY_EVERY === 0) {
    const c = arena.bountySpawns[bountyIdx++];
    if (c) placePellet(kept, c, 1, snakes, b);
  }

  // 6. Shrink (pre-scheduled cadence; stops at MIN_BOUND).
  const bounds = { ...b };
  if (tick % SHRINK_EVERY === 0) {
    if (bounds.x1 - bounds.x0 > MIN_BOUND) {
      bounds.x0++;
      bounds.x1--;
    }
    if (bounds.y1 - bounds.y0 > MIN_BOUND) {
      bounds.y0++;
      bounds.y1--;
    }
  }

  return { ...state, tick, bounds, pellets: kept, snakes, normalIdx, bountyIdx };
}

export function isTerminal(state: GameState): boolean {
  if (state.tick >= MAX_TICKS) return true;
  if (state.mode === 'solo') return !state.snakes[0].alive;
  return state.snakes.filter((sn) => sn.alive).length <= 1;
}

export function winnerOf(state: GameState): number | null {
  if (state.mode === 'solo') return state.snakes[0].alive ? 0 : null;
  const alive = state.snakes.filter((sn) => sn.alive);
  return alive.length === 1 ? alive[0].id : null;
}
