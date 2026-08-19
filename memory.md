# memory.md — Project memory

Quick orientation for any AI model dropped into this repo. For full state, read
`docs/AI_HANDOFF.md` → `docs/PROJECT_PROGRESS.md` → `COMPETITIVE_SNAKE_GAME.md` → `architecture/ARCHITECTURE.md`.

---

## What this is

**Competitive Snake** — a real-time, skill-based 1v1 snake battle built as a **Nimiq Pay Mini App**
for the **Nimiq Mini Apps Competition — Cycle II** (Aug 17 – Sep 11, 2026). Internal submission
target **Sep 6 (T-5)**. Wallet = player identity; rewards are skill-based, replay-verified, and paid
from a team-seeded pool — **not** a betting product.

## Source of truth (in order)

1. `COMPETITIVE_SNAKE_GAME.md` — living project doc: concept, decisions (D1–D39), rewards, roadmap, risks.
2. `architecture/ARCHITECTURE.md` — build blueprint (D25–D34).
3. `docs/lifecycle/` — lifecycle breakdown for each phase:
   - [`PHASE_1_SCAFFOLD.md`](docs/lifecycle/PHASE_1_SCAFFOLD.md) — W1 scaffold (Done ✅)
   - [`PHASE_2_MULTIPLAYER_WALLET.md`](docs/lifecycle/PHASE_2_MULTIPLAYER_WALLET.md) — W2 PvP, Wallet & Daily Mode (Current 🟡)
   - [`PHASE_3_REWARDS_EARLY_ACCESS.md`](docs/lifecycle/PHASE_3_REWARDS_EARLY_ACCESS.md) — W3 Automated Payouts & Early Access (Upcoming ⏳)
   - [`PHASE_4_HARDENING_SUBMISSION.md`](docs/lifecycle/PHASE_4_HARDENING_SUBMISSION.md) — W4 Production & Submission (Upcoming ⏳)
4. `docs/AI_HANDOFF.md` — where the last session ended and what's next.
5. `docs/PROJECT_PROGRESS.md` — milestone status + success metrics.

## Repo layout

```
packages/
├── sim/       @snake/sim     — pure deterministic simulation (single source of truth, ZERO runtime deps)
├── server/    @snake/server  — Fastify REST + Colyseus authoritative rooms + SQLite (WAL), single port
└── client/    @snake/client  — Vite + React + Phaser (render-only) mini app
.github/workflows/            — ci.yml (typecheck/lint/tests/build) + deploy.yml (Railway + static host)
```

Dependency direction (enforced): `server → sim` · `client → sim`. Client and server never import each other.

## Current state (2026-08-19)

- **W1 scaffold DONE + committed.** Sim ported with golden hashes locked; Colyseus room with tick loop;
  React/Phaser client with rotated viewport + local bot play; 23 tests green incl. a 2-client PvP e2e.
- **W2 active.** The official `@nimiq/mini-app-sdk` is installed; silent `init()` + `listAccounts()`
  identity and lobby display are implemented. Room-code join, schema mirror, deep-link input, and live
  input sending are partially wired. Authoritative rendering/interpolation, room creation/lifecycle,
  Today's Run signing, real-device validation, and Lawn League art remain.
- **PvP flow:** lobby can create a room through `POST /api/v1/rooms` and join by the generated 4-character
  code. Current capacity is explicitly 2 because the deterministic sim is still 1v1. Phaser keeps dead
  snakes rendered at reduced opacity in the final state, preventing the empty-board result screen. A
  3–4 player room selector must wait for a deliberate sim expansion and `SIM_VERSION` bump.

## Conventions & gotchas

- **Tooling:** pnpm 10 workspaces · Node 24 · TypeScript **5.9** (NOT 7 — breaks typescript-eslint) ·
  vitest 4 · Vite 8.
- **Colyseus pinned to 0.16** (0.16.25 core is a broken publish; 0.17 has no matching client lib).
  State schemas use `defineTypes()` + `declare` fields + constructor assignment — **never decorators**
  (default class-field semantics shadow the schema accessors; this bit us once already).
- **better-sqlite3 v13** ships prebuilt binaries (no build script; don't "fix" the install).
- **Server runtime = tsx** (source-mode; no build step). Production on Railway also runs `tsx src/index.ts`.
- **Sim rules:** tick-indexed, integer math, seeded RNG with context separation (arena/bot/effects),
  arena pre-derived from seed. `SIM_VERSION` gates every run; golden tests lock behavior.
- **UI is Tailwind v4** (`@import "tailwindcss"` in `packages/client/src/index.css`, Fresh Rink palette
  defined via `@theme`). Per `agents.md` Rule 1, all UI must use **Tailwind v4 canonical class names**
  (see the rename table in `agents.md`) — never v3 aliases like `shadow`, `rounded`, `ring`,
  `bg-gradient-to-*`, or `*-opacity-*`.
- **Wallet integration:** `packages/client/src/wallet/provider.ts` uses the official Mini App SDK. App
  load only initializes the provider; `listAccounts()` is called from explicit Connect because it opens
  a native confirmation. A typed `signWalletMessage()` wrapper is ready for Today's Run. Wallet access
  remains optional/non-blocking and still needs validation inside the Nimiq Pay WebView.
- **Wallet/daily APIs:** server exposes `/api/v1/wallet/register`, `/api/v1/wallet/:address`, and
  `/api/v1/leaderboard/today`. `/runs/verify` requires `{id, day, seed, reportedScore, attestation:
  {message, publicKey, signature}}`; the message must equal `snake-rink:today:{id}:{day}:{seed}:{score}`.
  Server verification now uses `@nimiq/core`; the public key must derive the submitted wallet address
  and the signature must verify the canonical message. Verified runs create/update wallet streak profiles.
- Today's Run attestation gate in `/runs/verify` is stubbed pending the tx-signing spike.
- Room codes: 4-char Crockford base32 (no I/L/O/U).

## Commands

```bash
pnpm install          # after cloning
pnpm dev              # server :8080 + client :5173 (Vite proxies /api + /colyseus)
pnpm typecheck        # tsc across all packages
pnpm test             # sim + server test suites
pnpm lint             # eslint (flat config, non-type-aware)
pnpm build            # server typecheck + client production build
```

## Deadlines

- **Internal target (T-5): Sep 6, 2026** — submit early.
- **Hard deadline: Sep 11, 2026, 23:59**.
- W3 scope gate (feature-freeze): **Sep 1**.
