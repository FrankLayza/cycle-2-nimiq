import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { getDb } from '../db/client.js';
import { NimiqPayoutBroadcaster } from '../services/nimiq-payouts.js';
import { settleDaily } from '../services/payouts.js';

function addExplorerUrl<T extends { txHash?: string }>(payout: T): T & { explorerUrl: string | null } {
  const txHash = payout.txHash;
  const base = loadConfig().nimNetwork === 'mainnet'
    ? 'https://nimiq.watch/#/tx/'
    : 'https://test-nimiq.watch/#/tx/';
  return { ...payout, explorerUrl: txHash ? `${base}${txHash}` : null };
}

function adminTokenOk(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  return req.headers['x-admin-token'] === loadConfig().adminToken;
}

export function registerAdmin(app: FastifyInstance): void {
  app.get('/api/v1/admin/stats', async (req, reply) => {
    if (!adminTokenOk(req)) return reply.code(401).send({ error: 'unauthorized' });
    const db = getDb();
    const runs = (db.prepare('SELECT COUNT(*) AS c FROM runs').get() as { c: number }).c;
    const wallets = (db.prepare('SELECT COUNT(DISTINCT wallet) AS c FROM runs').get() as { c: number }).c;
    return { runs, wallets };
  });

  app.post('/api/v1/admin/payouts/daily', async (req, reply) => {
    if (!adminTokenOk(req)) return reply.code(401).send({ error: 'unauthorized' });
    const day = String((req.query as { day?: unknown } | undefined)?.day ?? new Date().toISOString().slice(0, 10));
    if (!loadConfig().rewardSignerKey) {
      return reply.code(503).send({ error: 'reward signer is not configured', day, payouts: [] });
    }
    let broadcaster: NimiqPayoutBroadcaster | undefined;
    try {
      broadcaster = new NimiqPayoutBroadcaster();
      const payouts = await settleDaily(day, broadcaster);
      return { day, payouts: payouts.map(addExplorerUrl) };
    } catch (error) {
      return reply.code(502).send({
        error: error instanceof Error ? error.message : 'payout settlement failed',
        day,
        payouts: [],
      });
    } finally {
      await broadcaster?.close();
    }
  });
}
