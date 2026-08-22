import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client.js';
import { normalizeNimiqAddress } from './wallets.js';

export function registerStreaks(app: FastifyInstance): void {
  app.get('/api/v1/streaks/:wallet', async (req, reply) => {
    const rawAddress = String((req.params as { wallet?: unknown }).wallet ?? '');
    const wallet = normalizeNimiqAddress(rawAddress);
    if (!wallet) return reply.code(400).send({ error: 'invalid Nimiq address' });

    const profile = getDb()
      .prepare('SELECT streak, last_play_date AS lastPlayDate FROM wallets WHERE address = ?')
      .get(wallet) as { streak: number; lastPlayDate: string | null } | undefined;
    if (!profile) return reply.code(404).send({ error: 'wallet profile not found' });

    const best = getDb()
      .prepare("SELECT MAX(score) AS bestScore FROM runs WHERE wallet = ? AND mode = 'solo' AND status = 'verified'")
      .get(wallet) as { bestScore: number | null };
    return {
      streak: profile.streak,
      bestScore: best.bestScore,
      lastPlayDate: profile.lastPlayDate,
      badge: profile.streak >= 7 ? '7-day-streak' : null,
    };
  });
}
