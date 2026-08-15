import { SIM_VERSION } from './version.js';
import { replay } from './replay.js';
import type { AppliedInput, RunRecord } from './types.js';

/**
 * Combined score for Today's Run (solo): pellets + length + survival ticks (D28).
 * Placeholder formula — tune before launch; locked by golden tests once final.
 */
export function todayScore(seed: number, version: number, inputs: AppliedInput[][]): number {
  const r = replay(seed, version, inputs, 'solo');
  const sn = r.snakes[0];
  return sn.score + sn.length + r.ticks;
}

export interface VerifyResult {
  valid: boolean;
  score: number;
  reason?: string;
}

/**
 * Verify a submitted run: SIM_VERSION gate, deterministic replay of the input
 * log, and score match. Pure sim concern — the attestation signature (D34) is
 * verified server-side (Nimiq lib, W1 spike item) before this is called.
 */
export function verifyRun(record: RunRecord): VerifyResult {
  if (record.simVersion !== SIM_VERSION) {
    return { valid: false, score: 0, reason: `SIM_VERSION mismatch: ${record.simVersion}` };
  }
  let result;
  try {
    result = replay(record.seed, record.simVersion, record.inputs, record.mode);
  } catch (err) {
    return { valid: false, score: 0, reason: `replay failed: ${String(err)}` };
  }
  const sn = result.snakes[0];
  const score = record.mode === 'solo' ? sn.score + sn.length + result.ticks : sn.score;
  if (score !== record.reportedScore) {
    return { valid: false, score, reason: `score mismatch: reported ${record.reportedScore}, replayed ${score}` };
  }
  return { valid: true, score };
}
