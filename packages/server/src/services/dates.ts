/** Returns true for a canonical UTC calendar day that is not in the future. */
export function isEligibleUtcDay(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  return value <= now.toISOString().slice(0, 10);
}
