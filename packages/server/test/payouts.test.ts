import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KeyPair, PrivateKey } from '@nimiq/core';
import { replay, SIM_VERSION } from '@snake/sim';
import type { AppliedInput } from '@snake/sim';
import { closeDb, getDb } from '../src/db/client.js';
import { attestationMessage } from '../src/services/attestation.js';
import { dailyCandidates, PayoutSubmissionUnknownError, settleDaily } from '../src/services/payouts.js';

const DAY = '2026-08-21';
let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'snake-payouts-'));
  process.env.DB_PATH = join(tempDir, 'test.db');
});

afterEach(() => {
  closeDb();
  rmSync(tempDir, { recursive: true, force: true });
});

function insertVerifiedRun(id: string, keyByte: number, inputs: AppliedInput[][], messageOverride?: string): string {
  const keyPair = KeyPair.derive(new PrivateKey(new Uint8Array(32).fill(keyByte)));
  const wallet = keyPair.toAddress().toUserFriendlyAddress();
  const seed = 1234;
  const result = replay(seed, SIM_VERSION, inputs, 'solo');
  const score = result.snakes[0].score + result.snakes[0].length + result.ticks;
  const message = messageOverride ?? attestationMessage(DAY, seed, score, id);
  const signature = keyPair.sign(new TextEncoder().encode(message));
  const attestation = JSON.stringify({
    message,
    publicKey: keyPair.publicKey.toHex(),
    signature: signature.toHex(),
  });
  getDb().prepare(
    `INSERT INTO runs
      (id, day, wallet, seed, sim_version, mode, inputs, log_hash, score, length, status, attested_at, attestation)
     VALUES (?, ?, ?, ?, ?, 'solo', ?, ?, ?, ?, 'verified', ?, ?)`,
  ).run(id, DAY, wallet, seed, SIM_VERSION, JSON.stringify(inputs), `hash-${id}`, score, result.snakes[0].length, Date.now(), attestation);
  return wallet;
}

describe('daily payouts', () => {
  it('selects only the best verified run per wallet', () => {
    const wallet = insertVerifiedRun('run-1', 1, [[]]);
    insertVerifiedRun('run-2', 1, [[{ turn: 'up', boost: false }]]);
    insertVerifiedRun('run-3', 2, [[]]);
    const candidates = dailyCandidates(DAY);
    expect(candidates.filter((candidate) => candidate.wallet === wallet)).toHaveLength(1);
    expect(candidates).toHaveLength(2);
  });

  it('skips a non-canonical winner and promotes the next valid run', async () => {
    insertVerifiedRun('tampered', 3, [[]], 'validly-signed-but-wrong-message');
    const wallet = insertVerifiedRun('valid', 4, [[{ turn: 'up', boost: false }]]);
    const sent: string[] = [];
    const payouts = await settleDaily(DAY, {
      async send(recipient) {
        sent.push(recipient);
        return { txHash: 'valid-tx' };
      },
    });
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({ runId: 'valid', wallet, rank: 1, status: 'sent' });
    expect(sent).toEqual([wallet]);
  });

  it('returns an already-sent payout without broadcasting twice', async () => {
    insertVerifiedRun('winner', 4, [[]]);
    let calls = 0;
    const broadcaster = {
      async send() {
        calls += 1;
        return { txHash: 'tx-1' };
      },
    };
    expect((await settleDaily(DAY, broadcaster))[0].status).toBe('sent');
    expect((await settleDaily(DAY, broadcaster))[0].txHash).toBe('tx-1');
    expect(calls).toBe(1);
  });

  it('records a failed broadcast without marking it sent', async () => {
    insertVerifiedRun('failed', 5, [[]]);
    const payouts = await settleDaily(DAY, {
      async send() {
        throw new Error('network unavailable');
      },
    });
    expect(payouts[0]).toMatchObject({ status: 'failed', error: 'network unavailable' });
    expect(getDb().prepare('SELECT status, tx_hash FROM payouts').get()).toEqual({ status: 'failed', tx_hash: null });
  });

  it('does not retry a transfer whose network result is unknown', async () => {
    insertVerifiedRun('unknown', 6, [[]]);
    let calls = 0;
    const broadcaster = {
      async send() {
        calls += 1;
        throw new PayoutSubmissionUnknownError('submission timed out', 'tx-unknown');
      },
    };
    expect((await settleDaily(DAY, broadcaster))[0]).toMatchObject({ status: 'unknown', txHash: 'tx-unknown' });
    expect((await settleDaily(DAY, broadcaster))[0]).toMatchObject({ status: 'unknown', txHash: 'tx-unknown' });
    expect(calls).toBe(1);
  });

  it('does not retry a pending payout after an interrupted attempt', async () => {
    const wallet = insertVerifiedRun('interrupted', 7, [[]]);
    getDb().prepare(
      "INSERT INTO payouts (id, run_id, wallet, amount_nim, status, attempted_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    ).run('daily:interrupted', 'interrupted', wallet, 30, Date.now());
    let calls = 0;
    const payouts = await settleDaily(DAY, { async send() { calls += 1; return { txHash: 'duplicate' }; } });
    expect(payouts[0]).toMatchObject({ status: 'unknown' });
    expect(calls).toBe(0);
  });
});
