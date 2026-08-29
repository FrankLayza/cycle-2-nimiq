# AI_HANDOFF — Competitive Snake (Nimiq Mini App)

**Handoff written:** 2026-08-29 · **Next session should start here.**

Read, in order: `docs/AI_HANDOFF.md` → `docs/lifecycle/INDEX.md` → `docs/PROJECT_PROGRESS.md` → `COMPETITIVE_SNAKE_GAME.md` → `architecture/ARCHITECTURE.md` (as needed).

---

## Where we are

The project now supports 2–4 active PvP players with deterministic four-lane spawns and tick-major replay logs. Late spectator joins are rejected; a player who dies remains connected and watches the survivors. The UI received a second restrained premium polish pass: the landing page now scales from a richer desktop arena-entry layout to a scrollable mobile flow; PvP and Today's Run share a darker match frame and an explicit mobile control dock; and the Phaser field has recessed lawn depth, seeded mow bands, contact shadows, stronger pickup depth, and clearer shrink urgency.

Latest verification: lint and workspace typecheck passed; sim tests passed (16/16), client tests passed (29/29), and the serialized server suite passed (45/45). The full workspace test command is green.

**W1 scaffold is done and green** (typecheck + full tests + client build pass). The game core is real: a deterministic shared sim with replay verification, an authoritative Colyseus match room proven by a four-client e2e, and a React/Phaser client that plays local bot matches in the rotated Nimiq-Pay-style viewport.

**Current milestone: W2 (Aug 24–30).** The Fresh Rink client UI, unified match framing, dimensional Lawn League renderer, wallet integration, authoritative room-code PvP, responsive Today's Run flow, native result sharing, and code-split Phaser renderer are implemented. PvP joins are deferred past React StrictMode's development probe so a creator cannot occupy both seats accidentally. Next priority is two-client device validation, a real Nimiq Pay wallet/device pass, live data polish, and production payout wiring.

## State at handoff

- **Git:** Fortexfreddie's UI commits (`44de05b`, `d2c9972`, `7abde94`) are merged through `f4bb6ff`; current fixes are committed through the render-preservation change in the active branch. Payout settlement now re-verifies candidates, persists idempotent intents, and exposes `/api/v1/payouts/:runId`.
- **Unresolved (human):** competition registration + Skool; Railway/Pages deploy; funding and real-deployment validation of the seeded testnet signer; Nimiq Pay WebView/device validation. Public README and MIT license are present.
- **Known shortcuts:** server runs via `tsx`; Colyseus 0.16 remains pinned with `defineTypes()` schemas; PvP create/join-by-code supports 2–4 active seats, creator joins are deferred to avoid duplicate StrictMode connections, and dead players observe through their existing connection while late joins are rejected; wallet discovery and rotated controls still need real-WebView validation; `todayScore` remains a documented placeholder; exact collision-loss reasons are not exposed by sim state and should not be guessed in UI.
- **UI verification:** current typecheck, client tests, and client production build pass. The build is split into ~103 kB initial JS, ~325 kB gzip on-demand Phaser/control chunk, and ~3.8 kB Today's Run view chunk. Automated browser screenshots remain unavailable in this environment, so real-device portrait/safe-area validation is still required.

## Connection hardening completed (D47)

The server room now aligns patches with the 110ms simulation tick, validates input turns, rejects duplicate in-process PvP room codes, locks matches at play start, pauses on unexpected disconnects for bounded Colyseus reconnection, records consented/time-out forfeits as deterministic sim inputs, preserves dead-player state, and requires all remaining players to confirm a rematch. The focused room suite and full workspace tests cover these paths.

## Immediate next actions (W2)

The daily leaderboard contract and deterministic rank alignment were completed in commit `377b978`.
The deploy workflow lint gate was added in commit `5baefe2`.
Configured Railway webhook errors now fail deployment in `e8e410a`; an absent hook still skips deployment intentionally.
Both pipelines now run `@snake/client` tests in `f05676f`, closing the previous client-test coverage gap.
Production config validation was added in `1404a68` with corrected production-mode fixtures in `76c79cc`.
Commit `c8e15b6` additionally requires the production payout signer and rejects wildcard CORS.
The remaining work is deployment/device validation and explicitly approved non-frontend integration; do not
modify the frontend until the user approves it.

0. **Deferred debt:** server Vitest now passes cleanly with 45 tests; continue monitoring worker stability in CI.

1. Nimiq wallet: provider lifecycle, explicit account access, fallback states, and `signWalletMessage()` are implemented. Validate them in Nimiq Pay and add the address to the HUD.
2. Wallet/daily APIs: `/wallet/register`, `/wallet/:address`, `/leaderboard/today`, and `/streaks/:wallet` are implemented. Leaderboard responses include masked wallets/total count and rewards publish pool metadata. `/runs/verify` verifies the Nimiq public key/signature and binds verified runs to wallet streak profiles.
3. Real-device pass in Nimiq Pay: rotation/resize events, safe areas, touch/swipe/d-pad/boost, native share sheet, and wallet approval states.
4. Feed live leaderboard/streak data into Today's Run and the lobby; add wallet identity to the match HUD. The server streak endpoint is available for that integration.
5. Fund and validate the implemented Nimiq testnet reward broadcaster in deployment.
6. Keep server Vitest files serialized because the SQLite singleton and `DB_PATH` are process-global. The current
   shell cannot run Node/pnpm or reach external Nimiq documentation, so rerun the full cycle in CI or a Node 24/pnpm 10 environment and validate the pinned SDK against the live network.
7. Run verification and admin settlement now reject malformed/future UTC dates; continue deployment and WebView validation.
8. Sim: `todayScore` formula tuning + verify; then bump `SIM_VERSION` if it changes (golden tests will force this). A loss-reason contract would also require an intentional versioned sim change.

## Guardrails (do not break)

- `packages/sim` must stay zero-runtime-deps, pure, deterministic — golden hashes in `packages/sim/test/golden.test.ts` lock the sim; any rule change requires a `SIM_VERSION` bump (D31).
- Server/client import only the sim (`server → sim · client → sim`), never each other (architecture §1).
- Reward modes never contain bots (D5/D28); the room already enforces bot = free-play only.
- The house never holds player funds (D2/D4) — payouts only ever go out from the seeded pool.
- HUD/controls overlay the canvas absolutely (D11) — never in-flow.
- UI decision D43: Phaser remains render-only; visual depth is achieved with cached/procedural 2D layers, contact shadows, and restrained feedback rather than a gameplay-affecting 3D or shader stack.

## Environment notes

- pnpm 10 workspaces; Node 24; TS 5.9 (do not bump to TS 7 — typescript-eslint peer range).
- better-sqlite3 v13 ships prebuilt binaries (no build script needed).
- Colyseus 0.16.5 + @colyseus/core 0.16.24 + @colyseus/schema 3.0.76 + @colyseus/ws-transport 0.16.5 + colyseus.js 0.16.22. **Pinned on purpose** (0.16.25 core is a broken publish; 0.17 has no matching client).
- Dev: `pnpm dev` (server :8080 + client :5173, Vite proxies `/api` + `/colyseus`).
