import type { FastifyInstance } from 'fastify';

/** Published reward schedule (D17). Amounts are placeholders — pool is small and ours. */
export const REWARD_TIERS = [
  { rank: 1, nim: 30 },
  { rank: 2, nim: 20 },
  { rank: 3, nim: 10 },
] as const;

export const STREAK_BONUS = { days: 7, nim: 10 } as const;

export function registerRewards(app: FastifyInstance): void {
  app.get('/api/v1/rewards/schedule', async () => ({
    daily: REWARD_TIERS,
    weekly: [{ rank: 1, nim: 150 }],
    streakBonus: STREAK_BONUS,
    poolSource: 'team-seeded pool — the house never holds player funds (D2/D4). Payouts only ever go out.',
    rulesText:
      'Skill-based rewards with clearly defined rules and prizes. Outcomes are determined by skill ' +
      '(verified by server-side replay of your input log against the shared deterministic sim); ' +
      'the team only ever pays out from its own seeded pool.',
  }));
}
