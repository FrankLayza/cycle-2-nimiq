# Competitive Snake — Nimiq Mini App

A real-time, skill-based snake battle for the **Nimiq Mini Apps Competition — Cycle II**.
Wallet-powered identity + on-chain, replay-verified skill rewards. No betting — the house
never holds player funds.

Living project document (source of truth): [`COMPETITIVE_SNAKE_GAME.md`](./COMPETITIVE_SNAKE_GAME.md)
· Lifecycle & Roadmap: [`docs/lifecycle/`](./docs/lifecycle/INDEX.md)
· Architecture: [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) · Spike: [`spike/`](./spike)

## Layout (pnpm workspaces)

```
packages/
├── sim/       @snake/sim     — pure deterministic simulation (single source of truth, zero runtime deps)
├── server/    @snake/server  — Fastify REST + Colyseus authoritative rooms + SQLite
└── client/    @snake/client  — Vite + React + Phaser (render-only) mini app
```

Dependency direction (enforced): `server → sim` · `client → sim`. The client and server never
import each other.

## Dev

```bash
pnpm install
pnpm dev          # server (:8080) + client (:5173) concurrently
```

## Checks

```bash
pnpm typecheck    # tsc across all packages
pnpm test         # sim golden/determinism/replay + server unit tests
pnpm lint         # eslint (flat config)
pnpm build        # server + client production builds
```

## Production server

Run the server as a persistent Node service, not a serverless function. Mount a durable volume
for `DB_PATH` (for example `/data/snake.db`) so verified runs and payout records survive restarts.
Configure `ALLOWED_ORIGINS`, `ADMIN_TOKEN`, `SEED_SALT`, `APP_URL`, `NIM_NETWORK`, and the seeded
pool `REWARD_SIGNER_KEY` in the server environment. `REWARD_FEE_NIM` and `REWARD_POOL_NIM` are
optional numeric settings; keep the signer key server-side and never commit it.

The liveness endpoint is `GET /health`. Trigger daily settlement at 23:55 UTC with
`POST /api/v1/admin/payouts/daily?day=YYYY-MM-DD` and the `x-admin-token` header. Set
`PAYOUT_SCHEDULER=true` only when this instance is the designated fallback scheduler.

The client is a static build from `packages/client/dist`; set `VITE_API_URL`, `VITE_WS_URL`, and
`VITE_NIMIQ_ENV` at build time. See `.env.example` for the complete variable list.

## License

MIT (per competition rules).
