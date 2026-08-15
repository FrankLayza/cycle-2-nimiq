# Competitive Snake — Architecture (v1)

**Status:** specified · **Next:** W1 scaffold (repo + sim + server skeleton + client shell)
**Sources:** decisions D13–D34 in the living doc · spike results (`spike/SPIKE_REPORT.md`) · match scene spec (`design/match-scene-spec.md`) · strategy (`COMPETITIVE_SNAKE_GAME.md` §14–16)
**Repo placeholder:** `snake-rink` (naming open — D22)

---

## 0. Architecture principles (non-negotiable)

1. **One sim, everywhere.** `@snake/sim` is the single source of truth. The client renders it, the server runs it, the replay verifier replays it. Nothing else may simulate the game.
2. **Determinism is a build rule, not a hope.** The sim has no wall clock, no IO, no floating-point state, no unseeded randomness. Everything is tick-indexed and integer-based. `SIM_VERSION` gates every recorded run.
3. **The server is the authority for everything that matters.** PvP outcomes come from the server's own sim run; reward payouts require server-side replay verification of a signed attestation.
4. **The house never holds player funds** (D2). The reward signer only ever pays out from our seeded pool — never receives, never escrows.
5. **The client is a dumb renderer** (match-scene-spec §1, M4). Phaser never writes back to sim state; render must not affect sim output.
6. **One deployable server, host-agnostic static client.** REST + WebSocket on a single port; the client is pure static and can be dropped into any host (including the competition's own hosting).

---

## 1. Repo layout — npm workspaces monorepo

```
snake-rink/
├── package.json                 # workspaces: packages/*, root scripts (dev/build/test/typecheck/lint)
├── pnpm-workspace.yaml          # or npm workspaces — pick pnpm for speed + strict deps
├── tsconfig.base.json           # strict, ES2022, moduleResolution bundler
├── .eslintrc / .prettierrc
├── .env.example                 # documented env vars, never real secrets
├── .github/workflows/
│   ├── ci.yml                   # PR: typecheck + lint + sim golden tests + server tests + client build
│   └── deploy.yml               # main: build + deploy server (Railway) + client (Pages)
├── packages/
│   ├── sim/                     # @snake/sim — pure deterministic sim (ZERO deps, no IO)
│   ├── server/                  # @snake/server — Fastify REST + Colyseus rooms + SQLite + payouts
│   └── client/                  # @snake/client — Vite + React + TS + Phaser
└── docs/
    └── (competition notes, marketing calendar, this architecture)
```

**Dependency direction (enforced):** `server → sim` · `client → sim` · `server ⇄ client` never (they share only the sim and the API contract in `server/src/api/*.ts` types or a tiny `packages/contracts` if shared types grow).

---

## 2. Shared deterministic sim — `packages/sim` (the heart)

```
packages/sim/
├── package.json                 # name @snake/sim, "type": "module", zero runtime deps
├── tsconfig.json
├── src/
│   ├── index.ts                 # public API surface only
│   ├── version.ts               # SIM_VERSION (bump on ANY rule change)
│   ├── config.ts                # GRID_SIZE=30, TICK_MS=110, shrink schedule, boost burn rate, scoring
│   ├── rng.ts                   # splitmix32 seeded PRNG — pure, integer-safe
│   ├── types.ts                 # GameState, Snake, Pellet, InputLog, MatchResult, RunRecord
│   ├── arena.ts                 # seed → arena: pellet event schedule, shrink schedule, spawns (all pre-derived)
│   ├── sim.ts                   # step(state, tick, appliedInputs) → new state — pure function, no IO
│   ├── bot.ts                   # deterministic bot policy (pure, seeded) — free-play/PvP only
│   ├── replay.ts                # replay(seed, version, inputs) → MatchResult
│   └── verify.ts                # verifyRun(record) → { valid, score, reason }
└── test/
    ├── determinism.test.ts      # same seed + inputs ⇒ byte-identical result (spike tests ported)
    ├── replay.test.ts           # verify agree / disagree / tampered-input cases
    └── golden.test.ts           # golden hash of final state per fixed seed — regression lock (D31)
```

**Determinism build rules (D31):**
- **Tick-indexed only.** No `Date.now()`, no `Math.random`, no wall clock anywhere in the sim. The only wall-clock value in the whole system is the client's interpolation alpha (render-only, never in sim).
- **Integer state.** Cells, scores, lengths, tick counts — integers. Positions live in grid cells; the lerp between cells exists only in the Phaser renderer.
- **Seeded RNG with context separation.** `rng(seed, tick, context)` where `context ∈ {arena, bot, effects}` — arena generation never draws from the same stream as bot decisions.
- **Arena is pre-derived from the seed** (D28). The pellet event schedule (which pellet, which cell, which tick), the shrink schedule, and spawns are all computed once up front from the seed. "Identical arena for all" is literal — this is what makes Today's Run a pure-skill contest.
- **`SIM_VERSION` gate.** Bumped on any rule change. Every recorded run stores the version; verification rejects version mismatch. Old runs invalidate cleanly instead of silently re-scoring.
- **No rendering in sim.** Particles, bobbing, confetti, ghost trails are client-only (match-scene-spec M4).

**Public API:** `createRun(seed, version, mode)` · `step(run, tick, inputs)` · `replay(seed, version, inputs) → MatchResult` · `getArena(seed, version)` · constants. The spike's sim logic ports directly (it already proved determinism + replay in-browser).

---

## 3. Server layout — `packages/server`

```
packages/server/
├── package.json                 # fastify, @colyseus/ws-transport?, colyseus, better-sqlite3, @nimiq/*
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                 # bootstrap: Fastify + Colyseus (same port) + static-none + cron start
│   ├── config.ts                # env parsing + validation, CORS allowlist
│   ├── rooms/
│   │   ├── MatchRoom.ts         # authoritative Colyseus room (tick loop, input log, bot seats)
│   │   ├── schema.ts            # Colyseus state schema (patch-synced)
│   │   └── codes.ts             # 4-char Crockford base32 room codes (no I/L/O/U)
│   ├── api/
│   │   ├── health.ts            # GET /api/v1/health
│   │   ├── runs.ts              # today's seed · verify · leaderboards
│   │   ├── rewards.ts           # schedule · streaks · payout status
│   │   ├── rooms.ts             # create/resolve room codes
│   │   ├── wallet.ts            # register (optional profile)
│   │   └── admin.ts             # payout jobs + stats (admin-token auth)
│   ├── services/
│   │   ├── seed.ts              # daily seed derivation (date + SEED_SALT → seed), published via API
│   │   ├── replay.ts            # server-side replay + run record + log-hash dedupe
│   │   ├── leaderboard.ts       # daily/weekly compute, best-per-wallet, rank assignment
│   │   ├── streaks.ts
│   │   └── payouts.ts           # pool budget, signer, tx records, idempotency
│   ├── db/
│   │   ├── client.ts            # better-sqlite3, WAL, prepared statements
│   │   └── migrations/          # versioned SQL files, migrate() on boot
│   ├── wallet/                  # Nimiq tx-signing (REWARD_SIGNER_KEY) — W1 spike item
│   └── cron/jobs.ts             # daily/weekly payout scheduler (idempotent)
└── test/
    ├── replay.api.test.ts
    ├── leaderboard.test.ts
    └── room.e2e.test.ts         # 2 fake Colyseus clients → full match → replay reproduces state
```

**Single port (D26):** Fastify and Colyseus attach to the same Node http server (`new Colyseus.Server({ server: app.server })`). One origin serves REST (`/api/v1/*`) and WS (`/colyseus`). No separate WS port, no cross-origin WS headaches in the Nimiq Pay WebView.

---

## 4. Colyseus room protocol

Room name `match` · maxClients 8 (2 seats + up to 6 spectators) · modes: `bot` (free-play), `pvp` (room code), `today` (solo run, no room — see §5), `staked-testnet` (stretch, D33 extension point).

### 4.1 State schema (patch-synced at ~9 Hz)

```ts
class MatchState extends Schema {
  roomId: string;
  mode: 'bot' | 'pvp' | 'staked-testnet';
  seed: number;          // room seed (per-match random for bot/pvp; daily seed for today-mode parity)
  simVersion: number;
  tick: number;          // authoritative tick counter
  status: 'lobby' | 'countdown' | 'playing' | 'finished';
  boundary: number;      // current shrink boundary (from sim)
  nextShrinkTick: number;
  snakes: MapSchema<SnakeState>;   // seat0, seat1 (+ bots flagged isBot: true — D5)
  pellets: ArraySchema<Pellet>;    // current pellet set from the seeded schedule
  result?: MatchResult;  // winner, scores, cause — set on finish
}
class SnakeState { seat; wallet?; isBot; cells: ArraySchema<Cell>; score; length; alive; boosting; color }
```

Wall-clock appears only in render/UX fields (countdown display, latency ping) — never in sim state.

### 4.2 Messages

| Client → Server | Payload | Behavior |
|---|---|---|
| `joinRoom` | `{ code?, mode }` | create or join by code; seat assignment; full room ⇒ spectator |
| `ready` | `{}` | lobby gate (required for `staked-testnet` only in MVP) |
| `input` | `{ seq, dir, boost }` | buffered; applied to the **next tick**; echoed back; appended to authoritative input log |
| `rematch` | `{}` | both seats confirm → new room seed → countdown (no stakes — D3) |
| `leave` | `{}` | frees seat; in `bot` mode the server re-fills with a bot |

Server → client: schema patches · `matchEnd` event (`{ result, inputLogDigest }`) · `serverError`.

### 4.3 Authoritative tick loop

```
every TICK_MS (110):
  applied = { seat0: lastInput(seat0) ?? repeatLast, seat1: lastInput(seat1) ?? repeatLast }  // repeat last if none
  state   = sim.step(state, tick, applied)
  inputLog[tick] = applied                      // the verification payload (D27)
  if terminal condition → status = finished; compute result; emit matchEnd; persist PvP record
```

- **Missing inputs** repeat the last input (spike behavior) — grid movement reconciles naturally.
- **Input log** = exactly what the server applied, per tick, per seat. This is the authoritative record; it is what replay verification consumes.
- **Bots** (D5): inputs come from `sim.botPolicy` — only ever in `bot`/`pvp` free-play. Rewarded modes never contain a bot (see D28).
- **Latency:** no client-side prediction beyond input echo; the client interpolates between authoritative ticks (match-scene-spec §4). p95 latency ≤ 1 tick is a success metric (D19).

### 4.4 Room codes (D14)

4-char Crockford base32, `codes.ts`, TTL 2h idle, URL fallback `/?room=CODE`. Public random matchmaking stays a W4 stretch (D14).

---

## 5. REST API design — Fastify, `/api/v1`

All JSON. Wallet identified via `x-wallet` header (address). Public endpoints need no auth; admin endpoints need `x-admin-token`.

| Method & Path | Purpose | Request → Response |
|---|---|---|
| `GET /health` | liveness (Railway) | → `{ ok, version, simVersion }` |
| `GET /run/today` | today's challenge (D15) | → `{ date, seed, simVersion, arenaConfigHash, startsAt, endsAt, rewardTiers }` |
| `POST /runs/verify` | submit Today's Run (D28/D34) | `{ date, seed, version, inputs, reportedScore, wallet, attestation }` → `{ valid, score, rank, rewardTier?, runId }` |
| `GET /leaderboard/daily?date=&page=` | daily board | → `{ date, entries: [{ rank, maskedWallet, score, verified, isYou }], totalRuns }` |
| `GET /leaderboard/weekly?week=` | weekly board | → same shape |
| `GET /streaks/:wallet` | streak state | → `{ streak, bestScore, lastPlayDate, badge }` |
| `GET /rewards/schedule` | **published rules** ("clearly defined rules and prizes") | → `{ daily: [{rank, nim}], weekly, streakBonus, poolSize, rulesText }` |
| `GET /payouts/:runId` | settlement status for victory card | → `{ status: pending\|sent, amountNim, txHash, explorerUrl }` |
| `POST /rooms` | create room | `{ mode }` → `{ code, roomId, wsUrl }` |
| `GET /rooms/:code` | resolve code | → `{ roomId, mode, seats, expiresAt }` |
| `POST /wallet/register` | optional profile | `{ address }` → `{ ok }` |
| Admin (`x-admin-token`): |
| `POST /admin/payouts/daily` | daily settlement (cron 23:55 UTC) | → `{ payouts: [...] }` |
| `POST /admin/payouts/weekly` | weekly settlement (Sunday) | → `{ payouts: [...] }` |
| `GET /admin/stats` | unique wallets, runs, verification agreement | → counts + rates |

**Wallet masking** (wireframe open item): `NQxx…yy` for Nimiq, `0x12…34ab` for EVM — first 4 + last 4 chars.

### Today's Run flow (D15 + D28 + D34) — the reward loop

1. Client `GET /run/today` → `{ date, seed, ... }`.
2. Client runs the **solo seeded run** locally (no opponent — D28): same arena for everyone, score = pellets + length + survival under the shrink.
3. On finish, client signs a **one-time attestation** (message = `runId + date + seed + reportedScore`) — the NimQuest pattern (D34). Free-play and PvP matches remain sign-less.
4. Client `POST /runs/verify` with `{ seed, version, inputs, reportedScore, attestation }`.
5. Server replays the inputs against the daily seed with the shared sim → must reproduce the reported score → `valid`. Log-hash dedupe (`UNIQUE(day, log_hash)`) rejects copied runs (D29).
6. Best verified run per wallet that day lands on the leaderboard; rank + reward tier returned → victory card.
7. At day close (23:55 UTC) the payout job pays the top-3 from our pool (D17/D32).

**Render-only ghost** (D28 bonus): the daily board's #1 run is replayed from its stored input log and shown as a translucent ghost in other players' Today's Run — the "race the best" ritual, zero extra anti-cheat surface.

---

## 6. Database — SQLite (better-sqlite3)

- `DB_PATH` from env; **WAL mode**; single connection; prepared statements; versioned SQL migrations on boot.

```
wallets(address TEXT PK, created_at INT, streak INT DEFAULT 0, last_play_date TEXT, last_run_at INT)
runs(id TEXT PK, day TEXT, wallet TEXT, seed INT, sim_version INT, inputs TEXT /*JSON*/,
     log_hash TEXT, score INT, length INT, status TEXT /*pending|verified|invalid*/,
     attested_at INT, UNIQUE(day, log_hash))                    -- D29 log-copy rejection
leaderboard(day TEXT, match_type TEXT, wallet TEXT, score INT, rank INT,
            PRIMARY KEY(day, match_type, wallet))
payouts(id TEXT PK, run_id TEXT, wallet TEXT, amount_nim INT, tx_hash TEXT,
        status TEXT /*pending|sent|failed*/, paid_at INT)        -- idempotency: one tx per run
rooms(code TEXT PK, mode TEXT, room_id TEXT, seats TEXT, created_at INT, expires_at INT)
```

- Indexes: `runs(day, score DESC)`, `payouts(status)`.
- Best-per-wallet: `SELECT wallet, MAX(score) FROM runs WHERE day=? AND status='verified' GROUP BY wallet ORDER BY MAX(score) DESC`.

---

## 7. Payout pipeline (D17 · D32)

1. Cron (daily 23:55 UTC, weekly Sunday 23:55 UTC) → admin endpoint with `x-admin-token`.
2. Compute daily top-3 (30/20/10 NIM) / weekly top-1 (150 NIM) + 7-day streak bonus (10 NIM) from verified, attestation-checked runs.
3. Re-verify each winning run (replay), confirm no existing payout for that day/week/wallet (idempotent — run twice ⇒ one tx), apply per-wallet daily cap.
4. Signer sends NIM from our pool (`REWARD_SIGNER_KEY`, `NIM_NETWORK=testnet|mainnet`) → record `tx_hash` → mark `sent`.
5. Victory card reads `GET /payouts/:runId`.

**W1 spike item (flagged):** exact Nimiq tx-signing library (`@nimiq/core-web` vs RPC relay) + testnet faucet wiring must be resolved before payouts go live — testnet first, then mainnet with the small pool.

---

## 8. Deployment — Railway + static hosting

### Server — Railway (persistent, NOT serverless — D13)

- Service `snake-server`, Node 20, start `pnpm --filter @snake/server start`.
- **Volume** mounted at `/data` → `DB_PATH=/data/snake.db` (survives restarts/redepoys).
- Single `PORT` serves REST + WebSocket natively (Railway supports WS).
- Healthcheck `GET /health`.
- **Env:** `DB_PATH · PORT · ALLOWED_ORIGINS · ADMIN_TOKEN · REWARD_SIGNER_KEY · NIM_NETWORK · SEED_SALT · APP_URL`.
- **Cron:** Railway scheduled job POSTs `/api/v1/admin/payouts/daily` at 23:55 UTC with the admin token; fallback in-process scheduler guarded by a per-day `payouts` row (idempotent by construction).

### Client — static, host-agnostic

- `pnpm --filter @snake/client build` → `dist/` → Cloudflare Pages **or** Netlify **or** the competition's own hosting. Pure static by construction — the mini app URL is whatever the competition wants.
- **Env at build:** `VITE_API_URL · VITE_WS_URL · VITE_NIMIQ_ENV` (dev defaults proxy through Vite).
- **CORS:** server `ALLOWED_ORIGINS` = client origin + `localhost:*` (dev). WebView requests carry the app's origin — allowlisted, so no CORS failures in Nimiq Pay.

### CI — GitHub Actions

- `ci.yml` (PR): typecheck + lint + **sim golden tests** + server tests + client build.
- `deploy.yml` (main): tests → deploy server (Railway webhook/`railway up`) + client (Pages).

### Secrets policy

Server-side env only; `.env.example` documents names with dummy values; nothing real in the repo; client contains no secrets by construction (D13).

---

## 9. Golden determinism test (the regression lock — D31)

`packages/sim/test/golden.test.ts`: for N fixed seeds, replay a fixed input script → assert an **exact hash** of final state + score. Any sim change breaks the golden hash, forcing a conscious `SIM_VERSION` bump — which cleanly invalidates old runs instead of silently re-scoring them.

---

## 10. Testing & acceptance

- **sim:** determinism (byte-identical), replay verify agree/disagree/tampered, golden hashes.
- **server:** replay endpoint integration, best-per-wallet leaderboard, log-copy rejection, payout idempotency (double-run ⇒ one tx).
- **room:** 2 fake Colyseus clients play a full match → server-side input log → replay reproduces the final state (server-side M4).
- **client:** spike round-trip tests ported (6/6), match-scene-spec acceptance M1–M5.
- **device:** real-device pass in Nimiq Pay (rotation/safe-areas/touch) — W2 milestone per roadmap.

---

## 11. W1 scaffold checklist (what this doc turns into on day 1)

1. Root: workspaces, tsconfig base, lint/format, `dev` orchestration (server + client concurrently), `.env.example`, public MIT repo, competition registration + Skool join.
2. `packages/sim`: port the spike sim → module + **golden tests green** (first milestone).
3. `packages/server`: Fastify + Colyseus skeleton, MatchRoom tick loop, room codes, `/health`, DB migrations.
4. `packages/client`: Vite + React shell, rotated container + absolute overlay (D11), silent wallet connect stub, Phaser scene reading a local sim (spike path).
5. Deploy skeleton: Railway + Pages, `/health` green.
6. **Spike: Nimiq tx-signing + faucet** (payout prerequisite) — testnet only.
