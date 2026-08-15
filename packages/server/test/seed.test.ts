import { describe, expect, it } from 'vitest';
import { dailySeed } from '../src/services/seed.js';

describe('daily seed (D15/D28)', () => {
  it('is deterministic for the same day + salt', () => {
    expect(dailySeed('2026-08-17', 'salt')).toBe(dailySeed('2026-08-17', 'salt'));
  });

  it('differs across days and salts', () => {
    expect(dailySeed('2026-08-17', 'salt')).not.toBe(dailySeed('2026-08-18', 'salt'));
    expect(dailySeed('2026-08-17', 'salt')).not.toBe(dailySeed('2026-08-17', 'other-salt'));
  });

  it('produces a non-negative 32-bit seed', () => {
    const seed = dailySeed('2026-08-17', 'salt');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
