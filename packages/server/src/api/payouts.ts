import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client.js';
import { loadConfig } from '../config.js';

function explorerUrl(txHash: string | null): string | null {
  if (!txHash) return null;
  const base = loadConfig().nimNetwork === 'mainnet'
    ? 'https://nimiq.watch/#/tx/'
    : 'https://test-nimiq.watch/#/tx/';
  return `${base}${txHash}`;
}

interface PayoutRow {
  runId: string;
  wallet: string;
  amountNim: number;
  status: string;
  txHash: string | null;
  paidAt: number | null;
  attemptedAt: number | null;
}

export function registerPayouts(app: FastifyInstance): void {
  app.get('/api/v1/payouts/:runId', async (req, reply) => {
    const runId = String((req.params as { runId?: unknown }).runId ?? '');
    if (!runId) return reply.code(400).send({ error: 'runId is required' });
    const payout = getDb()
      .prepare(
        `SELECT run_id AS runId, wallet, amount_nim AS amountNim, status, tx_hash AS txHash, paid_at AS paidAt, attempted_at AS attemptedAt
         FROM payouts WHERE run_id = ?`,
      )
      .get(runId) as PayoutRow | undefined;
    if (!payout) return reply.code(404).send({ error: 'payout not found' });
    return { ...payout, explorerUrl: explorerUrl(payout.txHash) };
  });
}
