# AI_HANDOFF — Competitive Snake (Nimiq Mini App)

**Handoff written:** 2026-08-15 · **Next session should start here.**

Read, in order: `docs/AI_HANDOFF.md` → `docs/lifecycle/INDEX.md` → `docs/PROJECT_PROGRESS.md` → `COMPETITIVE_SNAKE_GAME.md` → `architecture/ARCHITECTURE.md` (as needed).

---

## Where we are

**W1 scaffold is done and green** (typecheck + 23 tests + client build pass). The game core is real: a deterministic shared sim with replay verification, an authoritative Colyseus match room proven by a two-client e2e, and a React/Phaser client that plays local bot matches in the rotated Nimiq-Pay-style viewport.

**Next milestone: W2 (Aug 24–30).** First action: Nimiq wallet `init()` identity + room-code PvP client wiring + first real-device pass.

## State at handoff

- **Git:** 2 commits (`feat: setting up the project`, `docs: lock architecture + design state`). W1 scaffold is committed as the next commit (this session). Working tree clean after commit.
- **Unresolved (human):** public repo + registration + Skool; Railway/Pages deploy; reward signer key (testnet) + tx-signing lib choice; D34 attestation signing needs the Nimiq lib before `/runs/verify` can drop the stub gate.
- **Known W1 shortcuts (by design, D35–D39):** server runs via `tsx` (no build step); Colyseus 0.16 pinned with `defineTypes()` schemas (`declare` fields + constructor assignment — do not switch to decorators); client PvP not yet wired (server side proven); Phaser scene is placeholder graphics (Lawn League art is W2); wallet is a stub; `todayScore` formula is a documented placeholder.

## Immediate next actions (W2)

1. Nimiq wallet: replace `packages/client/src/wallet/stub.ts` with the provider `init()` read-only identity (D7 — still silent, never blocking first match).
2. Client PvP: wire `packages/client/src/net/client.ts` + Lobby "Room code" button to `joinOrCreate('match', { mode: 'pvp', code })` with a client schema mirror (the e2e in `packages/server/test/room.e2e.test.ts` is the reference); live input forwarding + interpolation (match-scene-spec §4).
3. Today's Run client flow + signed attestation (needs tx-signing spike first).
4. Real-device pass in Nimiq Pay: rotation/resize events, safe areas, touch (spike §12 flagged).
5. Sim: `todayScore` formula tuning + verify; then bump `SIM_VERSION` if it changes (golden tests will force this).

## Guardrails (do not break)

- `packages/sim` must stay zero-runtime-deps, pure, deterministic — golden hashes in `packages/sim/test/golden.test.ts` lock the sim; any rule change requires a `SIM_VERSION` bump (D31).
- Server/client import only the sim (`server → sim · client → sim`), never each other (architecture §1).
- Reward modes never contain bots (D5/D28); the room already enforces bot = free-play only.
- The house never holds player funds (D2/D4) — payouts only ever go out from the seeded pool.
- HUD/controls overlay the canvas absolutely (D11) — never in-flow.

## Environment notes

- pnpm 10 workspaces; Node 24; TS 5.9 (do not bump to TS 7 — typescript-eslint peer range).
- better-sqlite3 v13 ships prebuilt binaries (no build script needed).
- Colyseus 0.16.5 + @colyseus/core 0.16.24 + @colyseus/schema 3.0.76 + @colyseus/ws-transport 0.16.5 + colyseus.js 0.16.22. **Pinned on purpose** (0.16.25 core is a broken publish; 0.17 has no matching client).
- Dev: `pnpm dev` (server :8080 + client :5173, Vite proxies `/api` + `/colyseus`).
