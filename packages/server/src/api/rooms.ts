import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client.js';
import { generateCode, isValidCode } from '../rooms/codes.js';

const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2h idle TTL (architecture §4.4)

export function registerRooms(app: FastifyInstance): void {
  app.post('/api/v1/rooms', async (req) => {
    const body = (req.body ?? {}) as { mode?: string; maxPlayers?: number };
    const mode = body.mode === 'pvp' ? 'pvp' : 'bot';
    const requestedPlayers = Number(body.maxPlayers ?? 4);
    const maxPlayers = Number.isInteger(requestedPlayers) ? Math.min(4, Math.max(2, requestedPlayers)) : 4;
    const code = generateCode();
    const now = Date.now();
    const db = getDb();
    db.prepare(
      'INSERT INTO rooms (code, mode, room_id, seats, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(code, mode, code, String(maxPlayers), now, now + ROOM_TTL_MS);
    return { code, mode, maxPlayers, roomId: code, wsUrl: '/colyseus', expiresAt: now + ROOM_TTL_MS };
  });

  app.get<{ Params: { code: string } }>('/api/v1/rooms/:code', async (req, reply) => {
    const code = req.params.code.toUpperCase();
    if (!isValidCode(code)) return reply.code(400).send({ error: 'invalid room code' });
    const row = getDb()
      .prepare('SELECT code, mode, seats, expires_at FROM rooms WHERE code = ?')
      .get(code) as { code: string; mode: string; seats: string; expires_at: number } | undefined;
    if (!row || row.expires_at < Date.now()) return reply.code(404).send({ error: 'room not found or expired' });
    return { code: row.code, mode: row.mode, maxPlayers: Number(row.seats), roomId: row.code, wsUrl: '/colyseus', expiresAt: row.expires_at };
  });
}
