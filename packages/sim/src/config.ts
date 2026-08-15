/** Arena grid: fixed 30x30, no wraparound — walls are fatal. */
export const GRID_SIZE = 30;

/** Base movement tick (~110ms) — identical for all snakes. */
export const TICK_MS = 110;

/** Boost doubles speed (~60ms effective); this many boosted ticks burn 1 tail segment (~1s). */
export const BOOST_TICKS = 9;

/** Boundary contracts every ~11s. */
export const SHRINK_EVERY = 100;

/** Smallest arena: 12x12, then shrinking stops. */
export const MIN_BOUND = 12;

/** Bounty pellet spawn cadence (~10s). */
export const BOUNTY_EVERY = 90;

/** Normal pellets kept on the board at all times. */
export const NORMAL_COUNT = 2;

/** Bounty pellets expire after this many ticks if uneaten. */
export const BOUNTY_MAX_AGE = 150;

/** Hard cap on any single match (safety net — matches are 60-90s ≈ 550-820 ticks). */
export const MAX_TICKS = 6000;

/** Boost moves the head 2 cells per tick. */
export const BOOST_SUBSTEPS = 2;

/** Number of pre-derived spawn candidates per pellet type (arena pre-derivation). */
export const SPAWN_CANDIDATES = 400;
