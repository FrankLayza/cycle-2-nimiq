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
3. `docs/AI_HANDOFF.md` — where the last session ended and what's next.
4. `docs/PROJECT_PROGRESS.md` — milestone status + success metrics.

## Repo layout

```
packages/
├── sim/       @snake/sim     — pure deterministic simulation (single source of truth, ZERO runtime deps)
├── server/    @snake/server  — Fastify REST + Colyseus authoritative rooms + SQLite (WAL), single port
└── client/    @snake/client  — Vite + React + Phaser (render-only) mini app
.github/workflows/            — ci.yml (typecheck/lint/tests/build) + deploy.yml (Railway + static host)
```

Dependency direction (enforced): `server → sim` · `client → sim`. Client and server never import each other.

## Current state (2026-08-15)

- **W1 scaffold DONE + committed.** Sim ported with golden hashes locked; Colyseus room with tick loop;
  React/Phaser client with rotated viewport + local bot play; 23 tests green incl. a 2-client PvP e2e.
- **Next: W2** — Nimiq wallet `init()` identity, client-side room-code PvP wiring, real-device pass in
  Nimiq Pay, Lawn League art. Full list in `docs/AI_HANDOFF.md`.

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
- **Wallet is a stub** (`packages/client/src/wallet/stub.ts`) — real Nimiq provider `init()` is W2.
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
