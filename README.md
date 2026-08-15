# Competitive Snake — Nimiq Mini App

A real-time, skill-based snake battle for the **Nimiq Mini Apps Competition — Cycle II**.
Wallet-powered identity + on-chain, replay-verified skill rewards. No betting — the house
never holds player funds.

Living project document (source of truth): [`COMPETITIVE_SNAKE_GAME.md`](./COMPETITIVE_SNAKE_GAME.md)
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

## License

MIT (per competition rules).
