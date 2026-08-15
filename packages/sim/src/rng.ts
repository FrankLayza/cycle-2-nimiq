/**
 * Deterministic seeded RNG with CONTEXT SEPARATION (D31).
 * The sim never draws from an unseeded or shared stream: every stream is
 * derived from (seed, tick, context) so arena generation, bot decisions, and
 * effects never influence each other — and identical for every player.
 */

export enum RngContext {
  Arena = 1,
  Bot = 2,
  Effects = 3,
}

/** mulberry32 — small, fast, integer-safe PRNG (ported from spike). */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-bit mix of (seed, tick, context) — the context-separation key. */
function mix(seed: number, tick: number, context: number): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (tick | 0), 0x85ebca6b);
  h = Math.imul(h ^ context, 0xc2b2ae35);
  h ^= h >>> 16;
  return h | 0;
}

/** Fresh independent RNG stream for (seed, tick, context). */
export function rngFor(seed: number, tick: number, context: RngContext): () => number {
  return mulberry32(mix(seed, tick, context));
}
