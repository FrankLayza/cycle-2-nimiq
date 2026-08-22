import { replay, SIM_VERSION } from '@snake/sim';
import type { AppliedInput } from '@snake/sim';
import { getDb } from '../db/client.js';
import { REWARD_TIERS } from '../api/rewards.js';
import { attestationMessage, verifyNimiqAttestation } from './attestation.js';

export interface PayoutCandidate {
  runId: string;
  wallet: string;
  amountNim: number;
  rank: number;
}

export interface PayoutRecord extends PayoutCandidate {
  id: string;
  status: 'sent' | 'failed' | 'unknown';
  txHash?: string;
  paidAt?: number;
  error?: string;
}

export interface PayoutBroadcaster {
  send(wallet: string, amountNim: number): Promise<{ txHash: string }>;
}

interface ExistingPayoutRow {
  id: string;
  wallet: string;
  amount_nim: number;
  status: 'pending' | 'sent' | 'failed' | 'unknown';
  tx_hash: string | null;
  paid_at: number | null;
  attempted_at: number | null;
}

interface EligiblePayout extends PayoutCandidate {
  row: VerifiedRunRow;
}

interface VerifiedRunRow {
  id: string;
  wallet: string;
  seed: number;
  sim_version: number;
  inputs: string;
  score: number;
  length: number;
  attestation: string;
  day: string;
}

function eligibleDailyPayouts(day: string): EligiblePayout[] {
  const rows = getDb().prepare(
    `SELECT id, day, wallet, seed, sim_version, inputs, score, length, attestation
     FROM runs
     WHERE day = ? AND mode = 'solo' AND status = 'verified'
     ORDER BY score DESC, wallet ASC, id ASC`,
  ).all(day) as VerifiedRunRow[];
  const best = new Map<string, VerifiedRunRow>();
  for (const row of rows) {
    if (!best.has(row.wallet) && reverify(row)) best.set(row.wallet, row);
  }
  return [...best.values()].slice(0, REWARD_TIERS.length).map((row, index) => ({
    runId: row.id,
    wallet: row.wallet,
    amountNim: REWARD_TIERS[index].nim,
    rank: index + 1,
    row,
  }));
}

function reverify(row: VerifiedRunRow): boolean {
  if (row.sim_version !== SIM_VERSION) return false;
  let inputs: AppliedInput[][];
  let attestation: { message: string; publicKey: string; signature: string };
  try {
    inputs = JSON.parse(row.inputs) as AppliedInput[][];
    attestation = JSON.parse(row.attestation) as typeof attestation;
  } catch {
    return false;
  }
  const replayed = replay(row.seed, row.sim_version, inputs, 'solo');
  const score = replayed.snakes[0].score + replayed.snakes[0].length + replayed.ticks;
  return score === row.score
    && replayed.snakes[0].length === row.length
    && attestation.message === attestationMessage(row.day, row.seed, row.score, row.id)
    && verifyNimiqAttestation(attestation, row.wallet);
}

/** Selects the best fully re-verified run per wallet, with deterministic tie-breaking. */
export function dailyCandidates(day: string): PayoutCandidate[] {
  return eligibleDailyPayouts(day).map((candidate) => ({
    runId: candidate.runId,
    wallet: candidate.wallet,
    amountNim: candidate.amountNim,
    rank: candidate.rank,
  }));
}

export async function settleDaily(day: string, broadcaster: PayoutBroadcaster): Promise<PayoutRecord[]> {
  const db = getDb();
  const candidates = eligibleDailyPayouts(day);
  const results: PayoutRecord[] = [];
  const findExisting = db.prepare(
    `SELECT id, wallet, amount_nim, status, tx_hash, paid_at, attempted_at FROM payouts WHERE run_id = ?`,
  );
  const insertPending = db.prepare(
    `INSERT INTO payouts (id, run_id, wallet, amount_nim, status) VALUES (?, ?, ?, ?, 'pending')`,
  );
  const markSent = db.prepare(`UPDATE payouts SET status = 'sent', tx_hash = ?, paid_at = ? WHERE id = ?`);
  const markFailed = db.prepare(`UPDATE payouts SET status = 'failed', paid_at = ? WHERE id = ?`);

  for (const candidate of candidates) {
    const existing = findExisting.get(candidate.runId) as ExistingPayoutRow | undefined;
    if (existing?.status === 'pending' && existing.attempted_at) {
      db.prepare("UPDATE payouts SET status = 'unknown' WHERE id = ?").run(existing.id);
      results.push({
        id: existing.id,
        runId: candidate.runId,
        wallet: existing.wallet,
        amountNim: existing.amount_nim,
        rank: candidate.rank,
        status: 'unknown',
        txHash: existing.tx_hash ?? undefined,
        paidAt: existing.paid_at ?? undefined,
        error: 'previous payout attempt has an unknown network result',
      });
      continue;
    }
    if (existing?.status === 'sent' || existing?.status === 'unknown') {
      results.push({
        id: existing.id,
        runId: candidate.runId,
        wallet: existing.wallet,
        amountNim: existing.amount_nim,
        rank: candidate.rank,
        status: existing.status,
        txHash: existing.tx_hash ?? undefined,
        paidAt: existing.paid_at ?? undefined,
      });
      continue;
    }
    const payoutId = existing?.id ?? `daily:${day}:${candidate.wallet}`;
    if (!existing) insertPending.run(payoutId, candidate.runId, candidate.wallet, candidate.amountNim);
    db.prepare('UPDATE payouts SET attempted_at = ? WHERE id = ?').run(Date.now(), payoutId);
    try {
      const tx = await broadcaster.send(candidate.wallet, candidate.amountNim);
      const paidAt = Date.now();
      markSent.run(tx.txHash, paidAt, payoutId);
      results.push({ ...candidate, id: payoutId, status: 'sent', txHash: tx.txHash, paidAt });
    } catch (error) {
      const paidAt = Date.now();
      const message = error instanceof Error ? error.message : 'payout failed';
      const unknownError = error instanceof PayoutSubmissionUnknownError ? error : null;
      const status = unknownError ? 'unknown' : 'failed';
      if (status === 'failed') markFailed.run(paidAt, payoutId);
      else db.prepare('UPDATE payouts SET status = ?, tx_hash = ?, paid_at = ? WHERE id = ?')
        .run(status, unknownError?.txHash ?? null, paidAt, payoutId);
      results.push({
        ...candidate,
        id: payoutId,
        status,
        txHash: unknownError?.txHash,
        paidAt,
        error: message,
      });
    }
  }
  return results;
}

/** Thrown when the broadcaster cannot establish whether the network accepted a signed transfer. */
export class PayoutSubmissionUnknownError extends Error {
  constructor(message: string, readonly txHash?: string) {
    super(message);
    this.name = 'PayoutSubmissionUnknownError';
  }
}
