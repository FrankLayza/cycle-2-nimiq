# PROJECT_PROGRESS — Competitive Snake (Nimiq Mini App)

<<<<<<< HEAD
**Updated:** 2026-08-20 · **Phase:** W2 client UI and wallet integration · **Next milestone:** real-device Nimiq Pay pass
=======
**Updated:** 2026-08-19 · **Phase:** W2 wallet integration (Build) · **Next milestone:** W2 — two-client PvP validation + real-device pass
>>>>>>> 187fbf7 (fix: fixed the snake rendering bug)

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
<<<<<<< HEAD
| Client shell | `packages/client` | 🟡 Fresh Rink lobby, match HUD/controls/result sharing, responsive Today's Run flow, authoritative PvP snapshot rendering, and Lawn League Phaser art are implemented; real-device QA remains |
=======
| Client shell | `packages/client` | 🟡 Local bot play works; official Nimiq Mini App SDK wallet initialization and room-code PvP wiring are implemented; creator connections are StrictMode-safe and authoritative rendering preserves live/final snakes |
>>>>>>> 187fbf7 (fix: fixed the snake rendering bug)
| CI / deploy workflows | `.github/workflows` | ✅ ci.yml (typecheck/lint/tests/build) + deploy.yml template (Railway webhook + static host) |

### Decisions made this milestone

D35 (scaffold runtime: tsx source-mode, no build orchestration) · D36 (Colyseus 0.16 pinned, `defineTypes()` schemas) · D37 (2-client PvP e2e verified) · D38 (verify API shipped early) · D39 (client plays local bot matches in W1; PvP wiring in W2) · D40 (Fresh Rink UI + code-split Lawn League renderer).

### Not done yet (needs human/credentials or is planned for W2)

1. **Public GitHub repo + MIT license + competition registration + Skool join** (W1 checklist, human action).
2. **Railway + Pages deploy wiring** (`RAILWAY_DEPLOY_HOOK` secret, real deploy) — `.env.example` + workflows ready.
3. **Nimiq tx-signing spike** (payout prerequisite) — `REWARD_SIGNER_KEY` wiring, testnet faucet (flagged in architecture §7).
<<<<<<< HEAD
4. **W2:** Official Nimiq SDK is installed and locked. Provider initialization is silent, account access is explicit (`listAccounts()` requires confirmation), lobby identity and the typed `sign()` wrapper are implemented. The Fresh Rink UI and Lawn League renderer are implemented. Remaining: real-WebView validation, device QA, live leaderboard/streak data, and wallet identity in the match HUD.
5. **Known verification issue:** client typecheck/tests/build pass. Full repo typecheck currently fails in `server/src/services/attestation.ts` because the installed Nimiq `Signature` type has no instance `verify`; server verify API tests currently receive 401 where legacy fixtures expect verified requests.
=======
4. **W2:** Official Nimiq SDK is installed and locked. Provider initialization is silent, account access is explicit (`listAccounts()` requires confirmation), lobby identity and the typed `sign()` wrapper are implemented. Server wallet profile registration, daily leaderboard endpoints, and cryptographic Nimiq attestation verification are implemented. Verified runs now bind/update wallet streak profiles. PvP now has create/join-by-code flow, StrictMode-safe creator joins, and preserves dead snakes in the final render; supported room capacity remains deterministic 1v1. Remaining: multi-seat simulation expansion (3–4 players), real-WebView validation, HUD identity, device QA, and Lawn League art.
>>>>>>> 187fbf7 (fix: fixed the snake rendering bug)
5. **Eslint** runs but is not yet wired into per-package type-aware checks (flat config, non-type-aware).

---

## Success metrics (D19) — tracking

- ✅ Functionality: replay verification agreement is unit-tested; p95 latency, match length, crash-free — verify on device in W2.
- ⏳ Usefulness/Repeat: N/A yet (no live users).
- ⏳ Marketing: no posts yet — start build-in-public cadence (D18: 2–3/wk).
- ⏳ Rewards pool: payouts pipeline is W2.
- ⏳ Rubric self-score: first 20-item self-score at W2 milestone.
