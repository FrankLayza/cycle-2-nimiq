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
    const day = String((req.query as { day?: unknown } | undefined)?.day ?? new Date().toISOString().slice(0, 10));
    if (!process.env.REWARD_SIGNER_KEY) {
      return reply.code(503).send({ error: 'reward signer is not configured', day, payouts: [] });
    }
    return reply.code(501).send({
      error: 'reward transaction broadcasting is not configured',
      day,
      payouts: [],
    });
  });
}
