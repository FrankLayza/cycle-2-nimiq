# PROJECT_PROGRESS — Competitive Snake (Nimiq Mini App)

**Updated:** 2026-08-29 · **Phase:** W2 multiplayer and connection hardening, wallet integration, and payout hardening · **Next milestone:** real-device Nimiq Pay pass + funded testnet validation

Source of truth: `COMPETITIVE_SNAKE_GAME.md` · Architecture: `architecture/ARCHITECTURE.md` · Lifecycle: [`docs/lifecycle/INDEX.md`](./lifecycle/INDEX.md) · Handoff: `docs/AI_HANDOFF.md`

---

## Milestone: W1 scaffold — DONE ✅

The monorepo is scaffolded and green. Verified locally (2026-08-15):

- `pnpm typecheck` — clean in all 3 packages.
- `pnpm test` — sim and server suites pass, including the **four-client Colyseus PvP e2e** and room capacity API coverage.
- `pnpm --filter @snake/client build` — builds; initial bundle 383 kB gzip (under the 400 kB spec budget).

### What exists now

| Piece | Where | State |
|---|---|---|
| Deterministic sim (single source of truth) | `packages/sim` | ✅ Ported from spike + arena pre-derivation (D28), context-separated RNG, `SIM_VERSION` gate (D31), golden hashes locked |
| REST + WS server (single port, D26) | `packages/server` | ✅ Fastify + Colyseus attach; health, Today's Run verification, room APIs, wallet profiles, leaderboard, rewards schedule, payout status, admin stats; SQLite/WAL with the §6 schema |
| Authoritative match room | `packages/server/src/rooms` | ✅ Tick loop (110ms), room codes (Crockford), bots free-play only (D5), input log capture (D27), rematch |
| Client shell | `packages/client` | 🟡 Responsive Lawn League landing page, room creation/join, unified PvP/Today's Run match framing, visible mobile control docks, dimensional Phaser arena, result sharing, wallet initialization, and room-code PvP are implemented; creator joins are StrictMode-safe and final snakes remain visible; real-device QA remains |
| CI / deploy workflows | `.github/workflows` | ✅ ci.yml (typecheck/lint/tests/build) + deploy.yml template (Railway webhook + static host) |

### Decisions made this milestone

D35 (scaffold runtime: tsx source-mode, no build orchestration) · D36 (Colyseus 0.16 pinned, `defineTypes()` schemas) · D37 (authoritative PvP e2e verified) · D38 (verify API shipped early) · D39 (client plays local bot matches in W1; PvP wiring in W2) · D40 (Fresh Rink UI + code-split Lawn League renderer) · D41 (Fresh Rink interaction polish) · D42 (StrictMode-safe PvP joins) · D43 (responsive landing, unified match/mobile controls, and restrained 2.5D Phaser depth) · D44 (2–4 active PvP seats; dead players observe, late spectator joins rejected).

### Not done yet (needs human/credentials or is planned for W2)

The daily leaderboard contract is complete (`/leaderboard/daily`, `/today` alias, pagination and validation),
and leaderboard, verification, and payout ranking now share deterministic tie-breaking.
The deploy workflow also runs lint before deployment (`5baefe2`).
Configured Railway webhook failures now stop deployment (`e8e410a`) instead of producing a false-green job.
CI and deploy also run the client Vitest suite (`f05676f`) before building the client.
Production startup now rejects unsafe defaults and malformed deployment configuration (`1404a68`, `76c79cc`).
It also requires the payout signer and rejects wildcard production CORS (`c8e15b6`).

1. **Public GitHub repo + MIT license + competition registration + Skool join** — `LICENSE` and production README are present; registration and Skool remain human actions.
2. **Railway + Pages deploy wiring** (`RAILWAY_DEPLOY_HOOK` secret, real deploy) — `.env.example` + workflows ready.
3. **Nimiq tx-signing implementation** — server builds/signs/broadcasts basic transfers via `@nimiq/core`; remaining work is funding and validating the signer in deployment.
4. **W2:** The official Nimiq SDK, Fresh Rink UI, and Lawn League renderer are implemented. Server wallet profiles, daily leaderboard/streak endpoints, masked leaderboard metadata, reward pool metadata, cryptographic attestations, and verified-run streak updates are implemented. PvP has create/join-by-code flow, StrictMode-safe creator joins, and 2–4 active seats; dead players keep receiving state while late spectator joins are rejected. Remaining: real-WebView validation, device QA, live leaderboard/streak data, and wallet identity in the match HUD.
5. **Verification:** full typecheck, lint, test suite, and client build pass on Node 24/pnpm 10; server Vitest files run serially to protect the SQLite singleton. Date input validation is covered for run verification and admin settlement.
6. **Eslint** runs but is not yet wired into per-package type-aware checks (flat config, non-type-aware).

---

### Connection hardening completed (D47)

The authoritative room now uses the 110ms simulation cadence for patches, rejects malformed input, blocks duplicate room-code instances, locks matches once play begins, pauses briefly for unexpected reconnects, records disconnect/timeout forfeits as deterministic inputs, and requires unanimous rematch confirmation. Focused room tests cover capacity, countdown cancellation, reconnection, malformed input, forfeits, and four-player play.

## Success metrics (D19) — tracking

## Deferred verification debt

- **Server Vitest worker errors:** the serialized server suite now passes cleanly; continue monitoring Vitest/Node/better-sqlite3 process handling in CI before release.

- ✅ Functionality: replay verification agreement is unit-tested; payout signing, explorer metadata, and unknown-submission handling are covered; p95 latency, match length, and crash-free operation remain device/deployment checks.
- ⏳ Usefulness/Repeat: N/A yet (no live users).
- ⏳ Marketing: no posts yet — start build-in-public cadence (D18: 2–3/wk).
- ⏳ Rewards pool: candidate selection, replay/attestation re-verification, payout intents, status lookup, transaction broadcasting, and explorer metadata are implemented; funding and on-chain deployment validation remain.
- ⏳ Rubric self-score: first 20-item self-score at W2 milestone.
