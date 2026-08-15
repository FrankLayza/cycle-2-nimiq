import { SIM_VERSION } from './version.js';
import { createRun, isTerminal, step, winnerOf } from './sim.js';
import { botPolicy } from './bot.js';
import type { AppliedInput, MatchResult, Mode } from './types.js';

const DEFAULT_INPUT: AppliedInput = { turn: null, boost: false };

/**
 * Resolve the applied input for `tick` from a client-style log (index = tick-1).
 * Missing ticks repeat the last input (D27); a log with no prior entry defaults
 * to { turn: null, boost: false }.
 */
function resolveInput(log: AppliedInput[], tick: number): AppliedInput {
  for (let t = tick - 1; t >= 0; t--) {
    const a = log[t];
    if (a) return a;
  }
  return DEFAULT_INPUT;
}

/**
 * Replay a full match from (seed, version, inputs) and reproduce the result
 * deterministically. Bot seats regenerate their own inputs via the seeded bot
 * policy, so a PvP/bot input log only needs the human seats.
 */
export function replay(seed: number, version: number, inputs: AppliedInput[][], mode: Mode): MatchResult {
  if (version !== SIM_VERSION) {
    throw new Error(`SIM_VERSION mismatch: got ${version}, expected ${SIM_VERSION}`);
  }
  let state = createRun(seed, mode, version);
  const seatCount = state.snakes.length;
  const log: AppliedInput[][] = [];
  while (!isTerminal(state)) {
    const applied: AppliedInput[] = [];
    for (let seat = 0; seat < seatCount; seat++) {
      const seatLog = inputs[seat] ?? [];
      const a = mode === 'bot' && seat === 1 ? botPolicy(state, seat) : resolveInput(seatLog, state.tick + 1);
      applied.push(a);
    }
    log.push(applied);
    state = step(state, applied);
  }
  return {
    mode,
    seed,
    version,
    ticks: state.tick,
    winner: winnerOf(state),
    snakes: state.snakes.map((sn) => ({ id: sn.id, score: sn.score, length: sn.cells.length, alive: sn.alive })),
    inputLog: log,
  };
}
