# Phase 1 (Week 1): Monorepo Scaffold & Deterministic Core

**Target Window:** Aug 17 – Aug 23, 2026  
**Status:** **COMPLETED ✅ (2026-08-15)**  
**Milestone Goal:** Prove the core game loop, deterministic simulation engine, authoritative server sync, and client shell with all tests green.

---

## 1. Objectives & Deliverables

1. **Deterministic Sim Engine (`packages/sim`):**
   - Pure TypeScript, zero runtime dependencies.
   - Integer math, tick-indexed (110ms base), seeded RNG with context separation.
   - Pre-derived arena geometry, shrink zone schedules (30×30 down to 12×12), boost tail-burning, and collision resolution (head-on & body).
   - Replay verification module and `SIM_VERSION` gate.
   - Golden-hash regression tests (`packages/sim/test/golden.test.ts`).

2. **Authoritative Server (`packages/server`):**
   - Fastify HTTP REST API (`/health`, `/api/v1/run/today`, `/rooms`, `/rewards/schedule`, `/admin/stats`).
   - Colyseus 0.16 authoritative match room (`MatchRoom.ts`) with tick loops and 4-character Crockford base32 room codes.
   - Replay verification endpoint (`/api/v1/runs/verify`) with sha256 input log deduplication (D29).
   - Embedded SQLite (better-sqlite3 WAL mode) with tables for `runs`, `rooms`, `rewards`, `stats`.
   - Automated 2-client Colyseus PvP end-to-end test suite (`packages/server/test/room.e2e.test.ts`).

3. **Client Shell (`packages/client`):**
   - React 19 + Vite 8 + Tailwind CSS v4 foundation.
   - CSS-rotated 16:9 landscape canvas within portrait-locked Nimiq Pay container.
   - Render-only Phaser 3 scene consuming simulation state.
   - Local bot play for instant first-load onboarding.
   - Mock wallet stub (`packages/client/src/wallet/stub.ts`).

4. **Tooling & CI:**
   - `pnpm` 10 workspaces, TypeScript 5.9, vitest 4.
   - GitHub Actions workflow (`.github/workflows/ci.yml`).

---

## 2. Verification & Acceptance Status

- [x] `pnpm typecheck` clean across all 3 packages.
- [x] `pnpm test` — 23 tests passing (12 sim tests + 11 server tests).
- [x] `pnpm --filter @snake/client build` — bundle size 383 kB gzip (within the 400 kB spec budget).
- [x] 2-client PvP room e2e passes deterministically.
