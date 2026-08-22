import { NimiqPayoutBroadcaster } from './nimiq-payouts.js';
import { settleDaily } from './payouts.js';
import { todayUtc } from './seed.js';

const SETTLEMENT_HOUR_UTC = 23;
const SETTLEMENT_MINUTE_UTC = 55;

function nextSettlement(now = new Date()): number {
  const target = new Date(now);
  target.setUTCHours(SETTLEMENT_HOUR_UTC, SETTLEMENT_MINUTE_UTC, 0, 0);
  if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime() - now.getTime();
}

/** Starts the optional in-process fallback for deployments without a scheduler service. */
export function startPayoutScheduler(): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      if (stopped) return;
      try {
        const broadcaster = new NimiqPayoutBroadcaster();
        try {
          await settleDaily(todayUtc(), broadcaster);
        } finally {
          await broadcaster.close();
        }
      } catch (error) {
        console.error('scheduled daily payout settlement failed', error);
      } finally {
        schedule();
      }
    }, nextSettlement());
    timer.unref();
  };
  schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
