import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { SIM_VERSION, verifyRun } from '@snake/sim';
import type { AppliedInput, RunRecord } from '@snake/sim';
import { loadConfig } from '../config.js';
import { getDb } from '../db/client.js';
import { dailySeed, todayUtc } from '../services/seed.js';
import { REWARD_TIERS } from './rewards.js';
import { attestationMessage, verifyNimiqAttestation } from '../services/attestation.js';
import { normalizeNimiqAddress } from './wallets.js';
import { isEligibleUtcDay } from '../services/dates.js';

export function logHashOf(inputs: AppliedInput[][]): string {
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

export function registerRuns(app: FastifyInstance): void {
  app.get('/api/v1/run/today', async () => {
    const cfg = loadConfig();
    const day = todayUtc();
    const seed = dailySeed(day, cfg.seedSalt);
    return {
      date: day,
      seed,
      simVersion: SIM_VERSION,
      startsAt: `${day}T00:00:00.000Z`,
      endsAt: `${day}T23:59:59.999Z`,
      rewardTiers: REWARD_TIERS,
      rules: 'Solo seeded run — identical arena for everyone. Score = pellets + length + survival ticks.',
    };
  });

  app.post('/api/v1/runs/verify', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<RunRecord> & { attestation?: string };
    const cfg = loadConfig();
    const day = body.day ?? todayUtc();
    const seed = Number(body.seed);
    const version = Number(body.simVersion);
    const wallet = normalizeNimiqAddress(String(body.wallet ?? ''));
    const inputs = body.inputs as AppliedInput[][] | undefined;
    const reportedScore = Number(body.reportedScore);
    const attestation = body.attestation as { message?: string; publicKey?: string; signature?: string } | undefined;
    const runId = String(body.id ?? '');

    if (typeof day !== 'string' || !isEligibleUtcDay(day)) {
      return reply.code(400).send({ error: 'day must be a valid non-future UTC date' });
    }
    if (!inputs || !Number.isFinite(seed) || !Number.isFinite(reportedScore)) {
      return reply.code(400).send({ error: 'missing fields: inputs, seed, reportedScore' });
    }
    if (!wallet) return reply.code(400).send({ error: 'invalid Nimiq wallet address' });
    if (seed !== dailySeed(day, cfg.seedSalt)) {
      return reply.code(400).send({ error: 'seed does not match the day' });
    }
    if (version !== SIM_VERSION) {
      return reply.code(400).send({ error: `SIM_VERSION mismatch: ${version}` });
    }
    if (!attestation?.message || !attestation.publicKey || !attestation.signature) {
      return reply.code(400).send({ error: 'attestation must include message, publicKey, and signature' });
    }
    if (!runId || attestation.message !== attestationMessage(day, seed, reportedScore, runId)) {
      return reply.code(400).send({ error: 'attestation message does not match run payload' });
    }
    if (!verifyNimiqAttestation(attestation as { message: string; publicKey: string; signature: string }, wallet)) {
      return reply.code(401).send({ error: 'invalid Nimiq wallet signature' });
    }

    const record: RunRecord = {
      id: runId || randomUUID(),
      day,
      wallet,
      seed,
      simVersion: version,
      mode: 'solo',
      inputs,
      reportedScore,
      logHash: logHashOf(inputs),
      attestedAt: Date.now(),
      attestation: JSON.stringify(attestation),
    };

    const res = verifyRun(record);
    if (!res.valid) {
      return reply.code(422).send({ valid: false, score: res.score, reason: res.reason });
    }

    const db = getDb();
    try {
      db.prepare(
        `INSERT INTO runs (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`,
      ).run(
        record.id,
        day,
        wallet,
        seed,
        version,
        'solo',
        JSON.stringify(inputs),
        record.logHash,
        res.score,
        res.length,
        record.attestedAt,
        record.attestation,
      );
    } catch (err) {
      if (String(err).includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ valid: false, reason: 'duplicate run — this input log was already submitted (D29)' });
      }
      throw err;
    }

    const rank = rankFor(day, wallet);
    db.prepare(
      `INSERT INTO wallets (address, created_at, streak, last_play_date, last_run_at)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(address) DO UPDATE SET
         streak = CASE
           WHEN wallets.last_play_date = excluded.last_play_date THEN wallets.streak
           WHEN wallets.last_play_date = date(excluded.last_play_date, '-1 day') THEN wallets.streak + 1
           ELSE 1
         END,
         last_play_date = excluded.last_play_date,
         last_run_at = excluded.last_run_at`,
    ).run(wallet, record.attestedAt, day, record.attestedAt);
    return {
      valid: true,
      score: res.score,
      rank,
      runId: record.id,
      rewardTier: rank !== null && rank <= REWARD_TIERS.length ? REWARD_TIERS.find((t) => t.rank === rank) : undefined,
    };
  });
}

function rankFor(day: string, wallet: string): number | null {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT wallet, score AS best, length AS best_length
       FROM (
         SELECT wallet, score, length,
           ROW_NUMBER() OVER (PARTITION BY wallet ORDER BY score DESC, length DESC, id ASC) AS row_num
         FROM runs
         WHERE day = ? AND status = 'verified'
       )
       WHERE row_num = 1
       ORDER BY best DESC, best_length DESC, wallet ASC`,
    )
    .all(day) as { wallet: string; best: number }[];
  const index = rows.findIndex((r) => r.wallet === wallet);
  return index >= 0 ? index + 1 : null;
}
