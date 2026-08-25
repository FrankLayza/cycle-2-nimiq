import { GRID_SIZE, MAX_TICKS, SHRINK_EVERY, SPAWN_CANDIDATES } from './config.js';
import { RngContext, rngFor } from './rng.js';
import type { Arena, Cell } from './types.js';

/**
 * Fixed spawns guarantee early separation (D12): four lanes enter from each
 * side of the arena, facing inward. An idle player gets a visible opening
 * before a deliberate turn creates a collision.
 */
export const SPAWNS: { id: number; cells: Cell[]; dir: { x: number; y: number } }[] = [
  { id: 0, cells: [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }], dir: { x: 1, y: 0 } },
  { id: 1, cells: [{ x: 23, y: 20 }, { x: 24, y: 20 }, { x: 25, y: 20 }], dir: { x: -1, y: 0 } },
  { id: 2, cells: [{ x: 20, y: 6 }, { x: 20, y: 5 }, { x: 20, y: 4 }], dir: { x: 0, y: 1 } },
  { id: 3, cells: [{ x: 10, y: 23 }, { x: 10, y: 24 }, { x: 10, y: 25 }], dir: { x: 0, y: -1 } },
];

function key(c: Cell): string {
  return c.x + ',' + c.y;
}

/**
 * Pre-derive the full arena from the seed (D28): initial pellets, every future
 * pellet spawn candidate, and the shrink schedule, all drawn once up front from
 * the Arena RNG context. Nothing in the arena stream is influenced by gameplay.
 */
export function deriveArena(seed: number): Arena {
  const rng = rngFor(seed, 0, RngContext.Arena);
  const occupied = new Set<string>();
  for (const s of SPAWNS) for (const c of s.cells) occupied.add(key(c));

  const pick = (): Cell => {
    // Rejection-sample a free cell (never on a spawn cell, never a duplicate).
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(rng() * GRID_SIZE);
      const y = Math.floor(rng() * GRID_SIZE);
      if (!occupied.has(key({ x, y }))) {
        occupied.add(key({ x, y }));
        return { x, y };
      }
    }
    // Extremely unlikely fallback (grid nearly full): deterministic linear scan.
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!occupied.has(key({ x, y }))) {
          occupied.add(key({ x, y }));
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  };

  const initialNormal = [pick(), pick()];
  const initialBounty = pick();
  const normalSpawns: Cell[] = [];
  const bountySpawns: Cell[] = [];
  for (let i = 0; i < SPAWN_CANDIDATES; i++) {
    normalSpawns.push(pick());
    bountySpawns.push(pick());
  }

  const shrinkTicks: number[] = [];
  for (let t = SHRINK_EVERY; t <= MAX_TICKS; t += SHRINK_EVERY) shrinkTicks.push(t);

  return { seed, shrinkTicks, initialNormal, initialBounty, normalSpawns, bountySpawns };
}
