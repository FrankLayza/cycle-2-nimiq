import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client.js';
import { todayUtc } from '../services/seed.js';

export function registerLeaderboard(app: FastifyInstance): void {
  app.get('/api/v1/leaderboard/today', async (req) => {
    const day = String((req.query as { date?: unknown } | undefined)?.date ?? todayUtc());
    const wallet = String((req.query as { wallet?: unknown } | undefined)?.wallet ?? '');
    const rows = getDb().prepare(
      `SELECT wallet, MAX(score) AS score, MAX(length) AS length
       FROM runs WHERE day = ? AND mode = 'solo' AND status = 'verified'
       GROUP BY wallet ORDER BY score DESC, wallet ASC LIMIT 100`,
    ).all(day) as Array<{ wallet: string; score: number; length: number }>;
    const entries = rows.map((row, index) => ({ rank: index + 1, ...row }));
    return {
      date: day,
      entries,
      personal: wallet ? entries.find((entry) => entry.wallet === wallet) ?? null : null,
    };
  });
}
