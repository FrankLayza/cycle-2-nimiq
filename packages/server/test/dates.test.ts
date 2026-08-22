import { describe, expect, it } from 'vitest';
import { isEligibleUtcDay } from '../src/services/dates.js';

describe('UTC day validation', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');

  it('accepts canonical current and historical dates', () => {
    expect(isEligibleUtcDay('2026-08-23', now)).toBe(true);
    expect(isEligibleUtcDay('2026-08-22', now)).toBe(true);
  });

  it('rejects malformed, impossible, and future dates', () => {
    expect(isEligibleUtcDay('2026-8-23', now)).toBe(false);
    expect(isEligibleUtcDay('2026-02-30', now)).toBe(false);
    expect(isEligibleUtcDay('2026-08-24', now)).toBe(false);
  });
});
