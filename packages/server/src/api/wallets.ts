import type { FastifyInstance } from 'fastify';
import { Address } from '@nimiq/core';
import { getDb } from '../db/client.js';

export function normalizeNimiqAddress(value: string): string | null {
  try {
    return Address.fromString(value.replace(/\s+/g, '').toUpperCase()).toUserFriendlyAddress();
  } catch {
    return null;
  }
}

export function registerWallets(app: FastifyInstance): void {
  app.post('/api/v1/wallet/register', async (req, reply) => {
    const rawAddress = String((req.body as { address?: unknown } | undefined)?.address ?? '');
    const address = normalizeNimiqAddress(rawAddress);
    if (!address) return reply.code(400).send({ error: 'invalid Nimiq address' });

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO wallets (address, created_at) VALUES (?, ?)').run(address, Date.now());
    const profile = db
      .prepare('SELECT address, created_at, streak, last_play_date, last_run_at FROM wallets WHERE address = ?')
      .get(address);
    return { ok: true, profile };
  });

  app.get('/api/v1/wallet/:address', async (req, reply) => {
    const rawAddress = String((req.params as { address?: unknown }).address ?? '');
    const address = normalizeNimiqAddress(rawAddress);
    if (!address) return reply.code(400).send({ error: 'invalid Nimiq address' });

    const profile = getDb()
      .prepare('SELECT address, created_at, streak, last_play_date, last_run_at FROM wallets WHERE address = ?')
      .get(address);
    if (!profile) return reply.code(404).send({ error: 'wallet profile not found' });
    return { profile };
  });
}
