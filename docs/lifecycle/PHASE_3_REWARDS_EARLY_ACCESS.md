# Phase 3 (Week 3): Automated Rewards, Streaks & Early Access

**Target Window:** Aug 31 – Sep 6, 2026  
**Status:** **UPCOMING ⏳**  
**Milestone Goal:** Automated daily reward settlement pipeline, retention streaks, early access community testing, and strict Feature Freeze (Sep 1 scope gate).

---

## 1. Objectives & Task Breakdown

### Task 3.1 — Automated Settlement & Payout Engine (`packages/server`)
- [ ] Build background payout runner (cron/worker) triggering at 23:55 UTC daily.
- [ ] Lock daily leaderboard, select top 3 runs (`1st: 30 NIM`, `2nd: 20 NIM`, `3rd: 10 NIM`), and weekly top 1.
- [ ] Re-run sim replay verification and sybil checks before initiating transactions.
- [ ] Sign and broadcast on-chain Nimiq transactions from the seeded pool using `REWARD_SIGNER_KEY`.
- [ ] Record transaction hash and timestamp idempotently in the SQLite `payouts` table.
- [ ] Surface on-chain explorer links (`https://test-nimiq.watch/#/tx/...` / mainnet) on settlement cards.

### Task 3.2 — Streaks & Retention Mechanics (`packages/server` & `packages/client`)
- [ ] Track consecutive daily active play days per wallet in SQLite.
- [ ] Award 7-day streak bonus badge and small NIM reward (10 NIM).
- [ ] Add streak flame counter and progress bar to the lobby UI.

### Task 3.3 — Scope Gate & Feature Freeze (Sep 1)
- [ ] Conduct formal scope audit per D16.
- [ ] Freeze new feature development.
- [ ] Move uncompleted non-core items to post-competition backlog (e.g. public random matchmaking, extra cosmetic skins).

### Task 3.4 — Community Early Access & Build-in-Public
- [ ] Deploy staging build for early testers and community members.
- [ ] Collect bug reports, network latency logs, and device layout feedback.
- [ ] Publish Cycle II build-in-public updates (posts 3 & 4) on X / Skool.
- [ ] Attend Sip & Ship community call (Sep 2).

---

## 2. Acceptance Criteria for Phase 3

- [ ] Daily leaderboard automatically settles and dispatches on-chain transactions to testnet wallets.
- [ ] Streaks correctly calculate across consecutive days.
- [ ] Zero unhandled errors in server tick loop under continuous load.
- [ ] All feature work locked by Sep 1.
