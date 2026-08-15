import { createHash } from 'node:crypto';

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Derive the daily Today's Run seed from (date, salt) — published via the API
 * (D15/D28). Deterministic per day; the salt keeps the arena unpredictable
 * until the day starts and is a server secret.
 */
export function dailySeed(date: string, salt: string): number {
  const h = createHash('sha256').update(`${date}:${salt}`).digest();
  return h.readUInt32BE(0) >>> 0;
}
