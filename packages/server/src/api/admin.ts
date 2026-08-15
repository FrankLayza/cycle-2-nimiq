import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { getDb } from '../db/client.js';

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
    // W2: payout pipeline (D17/D32) — cron 23:55 UTC, re-verify + attestation +
    // idempotency, then the signer pays top-3 from our pool (testnet first).
    return { payouts: [], note: 'W2 — payout pipeline not implemented yet' };
  });
}
