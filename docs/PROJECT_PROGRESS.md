# PROJECT_PROGRESS — Competitive Snake (Nimiq Mini App)

**Updated:** 2026-08-15 · **Phase:** W1 scaffold (Build) · **Next milestone:** W2 — wallet init + PvP client wiring + real-device pass

Source of truth: `COMPETITIVE_SNAKE_GAME.md` · Architecture: `architecture/ARCHITECTURE.md` · Lifecycle: [`docs/lifecycle/INDEX.md`](./lifecycle/INDEX.md) · Handoff: `docs/AI_HANDOFF.md`

---

## Milestone: W1 scaffold — DONE ✅

The monorepo is scaffolded and green. Verified locally (2026-08-15):

- `pnpm typecheck` — clean in all 3 packages.
- `pnpm test` — **23 tests passing**: 12 sim (golden hash lock D31, determinism, replay verification) + 11 server (room codes, daily seed, Today's Run verify API, and the **2-client Colyseus PvP e2e** — D37).
- `pnpm --filter @snake/client build` — builds; initial bundle 383 kB gzip (under the 400 kB spec budget).

### What exists now

| Piece | Where | State |
|---|---|---|
| Deterministic sim (single source of truth) | `packages/sim` | ✅ Ported from spike + arena pre-derivation (D28), context-separated RNG, `SIM_VERSION` gate (D31), golden hashes locked |
| REST + WS server (single port, D26) | `packages/server` | ✅ Fastify + Colyseus attach; `/health`, `/api/v1/run/today`, `/runs/verify`, `/rooms`, `/rewards/schedule`, `/admin/stats`; SQLite/WAL with the §6 schema |
| Authoritative match room | `packages/server/src/rooms` | ✅ Tick loop (110ms), room codes (Crockford), bots free-play only (D5), input log capture (D27), rematch |
| Client shell | `packages/client` | ✅ React lobby → local bot match; rotated landscape viewport + absolute overlay (D11); render-only Phaser scene; silent wallet stub |
| CI / deploy workflows | `.github/workflows` | ✅ ci.yml (typecheck/lint/tests/build) + deploy.yml template (Railway webhook + static host) |

### Decisions made this milestone

D35 (scaffold runtime: tsx source-mode, no build orchestration) · D36 (Colyseus 0.16 pinned, `defineTypes()` schemas) · D37 (2-client PvP e2e verified) · D38 (verify API shipped early) · D39 (client plays local bot matches in W1; PvP wiring in W2).

### Not done yet (needs human/credentials or is planned for W2)

1. **Public GitHub repo + MIT license + competition registration + Skool join** (W1 checklist, human action).
2. **Railway + Pages deploy wiring** (`RAILWAY_DEPLOY_HOOK` secret, real deploy) — `.env.example` + workflows ready.
3. **Nimiq tx-signing spike** (payout prerequisite) — `REWARD_SIGNER_KEY` wiring, testnet faucet (flagged in architecture §7).
4. **W2:** Nimiq provider `init()` wallet identity, room-code PvP **client** wiring (server side already e2e-verified), Today's Run client flow + attestation signing, real-device pass in Nimiq Pay, Lawn League art.
5. **Eslint** runs but is not yet wired into per-package type-aware checks (flat config, non-type-aware).

---

## Success metrics (D19) — tracking

- ✅ Functionality: replay verification agreement is unit-tested; p95 latency, match length, crash-free — verify on device in W2.
- ⏳ Usefulness/Repeat: N/A yet (no live users).
- ⏳ Marketing: no posts yet — start build-in-public cadence (D18: 2–3/wk).
- ⏳ Rewards pool: payouts pipeline is W2.
- ⏳ Rubric self-score: first 20-item self-score at W2 milestone.
