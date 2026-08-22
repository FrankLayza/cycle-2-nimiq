import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client.js';
import { todayUtc } from '../services/seed.js';
import { maskWallet } from '../services/wallet-display.js';

export function registerLeaderboard(app: FastifyInstance): void {
  app.get('/api/v1/leaderboard/today', async (req) => {
    const day = String((req.query as { date?: unknown } | undefined)?.date ?? todayUtc());
    const wallet = String((req.query as { wallet?: unknown } | undefined)?.wallet ?? '');
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
    const entries = ranked.slice(0, 100).map((row, index) => ({ rank: index + 1, ...row, maskedWallet: maskWallet(row.wallet) }));
    const personalEntry = wallet ? ranked.find((entry) => entry.wallet === wallet) : undefined;
    const personal = personalEntry ? { rank: ranked.indexOf(personalEntry) + 1, ...personalEntry, maskedWallet: maskWallet(personalEntry.wallet) } : null;
    return {
      date: day,
      entries,
      personal,
      totalRuns: ranked.length,
    };
  });
}
