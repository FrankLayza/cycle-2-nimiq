// Public API surface of @snake/sim — the single source of truth.
export { SIM_VERSION } from './version.js';
export * from './config.js';
export * from './rng.js';
export { deriveArena, SPAWNS } from './arena.js';
export { botPolicy } from './bot.js';
export { createRun, step, isTerminal, winnerOf, dirVec } from './sim.js';
export { replay } from './replay.js';
export { verifyRun, todayScore } from './verify.js';
export type * from './types.js';
