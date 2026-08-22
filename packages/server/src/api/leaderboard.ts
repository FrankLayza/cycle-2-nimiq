import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getDb } from '../db/client.js';
import { todayUtc } from '../services/seed.js';
import { maskWallet } from '../services/wallet-display.js';
import { isEligibleUtcDay } from '../services/dates.js';
import { normalizeNimiqAddress } from './wallets.js';

export function registerLeaderboard(app: FastifyInstance): void {
  const handler = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as { date?: unknown; wallet?: unknown; page?: unknown } | undefined);
    const day = String(query?.date ?? todayUtc());
    const rawWallet = String(query?.wallet ?? '');
    const wallet = rawWallet ? normalizeNimiqAddress(rawWallet) : null;
    if (rawWallet && !wallet) return reply.code(400).send({ error: 'invalid Nimiq wallet address' });
    const page = Number(query?.page ?? 1);
    if (!isEligibleUtcDay(day)) return reply.code(400).send({ error: 'date must be a valid non-future UTC date' });
    if (!Number.isInteger(page) || page < 1) return reply.code(400).send({ error: 'page must be a positive integer' });
    const rows = getDb().prepare(
      `SELECT id, wallet, score, length
       FROM runs WHERE day = ? AND mode = 'solo' AND status = 'verified'
       ORDER BY score DESC, length DESC, wallet ASC, id ASC`,
    ).all(day) as Array<{ id: string; wallet: string; score: number; length: number }>;
    const bestByWallet = new Map<string, { wallet: string; score: number; length: number }>();
    for (const row of rows) {
      if (!bestByWallet.has(row.wallet)) bestByWallet.set(row.wallet, { wallet: row.wallet, score: row.score, length: row.length });
    }
    const ranked = [...bestByWallet.values()];
    const pageSize = 100;
    const start = (page - 1) * pageSize;
    const entries = ranked.slice(start, start + pageSize).map((row, index) => ({
      rank: start + index + 1,
      maskedWallet: maskWallet(row.wallet),
      score: row.score,
      length: row.length,
      verified: true,
      isYou: row.wallet === wallet,
    }));
    const personalEntry = wallet ? ranked.find((entry) => entry.wallet === wallet) : undefined;
    const personal = personalEntry ? { rank: ranked.indexOf(personalEntry) + 1, ...personalEntry, maskedWallet: maskWallet(personalEntry.wallet) } : null;
    return {
      date: day,
      entries,
      personal,
      totalRuns: ranked.length,
      page,
      pageSize,
    };
  };
  app.get('/api/v1/leaderboard/daily', handler);
  app.get('/api/v1/leaderboard/today', handler);
}
