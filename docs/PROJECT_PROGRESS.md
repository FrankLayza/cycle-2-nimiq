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
| Client shell | `packages/client` | 🟡 Landscape-first shell, turf-tiled pixel-art arena, generated pixel snakes with rounded corners, swipe/hold gesture play, rebuilt lobby, room creation/join, unified PvP/Today's Run framing, result sharing, wallet initialization, and room-code PvP are implemented; creator joins are StrictMode-safe and final snakes remain visible; verified by browser screenshots, **real-device Nimiq Pay QA still outstanding** |
| CI / deploy workflows | `.github/workflows` | ✅ ci.yml (typecheck/lint/tests/build) + deploy.yml template (Railway webhook + static host) |

### Decisions made this milestone

D35 (scaffold runtime: tsx source-mode, no build orchestration) · D36 (Colyseus 0.16 pinned, `defineTypes()` schemas) · D37 (authoritative PvP e2e verified) · D38 (verify API shipped early) · D39 (client plays local bot matches in W1; PvP wiring in W2) · D40 (Fresh Rink UI + code-split Lawn League renderer) · D41 (Fresh Rink interaction polish) · D42 (StrictMode-safe PvP joins) · D43 (responsive landing, unified match/mobile controls, and restrained 2.5D Phaser depth) · D44 (2–4 active PvP seats; dead players observe, late spectator joins rejected) · D45 (room connection hardening) · D46 (landscape-first, gesture-only play; d-pad and boost button removed) · D47 (pixel-art direction from CC0 asset packs; supersedes D43's procedural-layers clause).

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

### Connection hardening completed (D45)

The authoritative room now uses the 110ms simulation cadence for patches, rejects malformed input, blocks duplicate room-code instances, locks matches once play begins, pauses briefly for unexpected reconnects, records disconnect/timeout forfeits as deterministic inputs, and requires unanimous rematch confirmation. Focused room tests cover capacity, countdown cancellation, reconnection, malformed input, forfeits, and four-player play.

### Client art direction and controls completed (D46/D47)

Commits `9edcde1`, `6b65974`, `8f8d3d3`, `5ca83d7`, `0a2bb3c`, `3e649f3`. Client tests grew 3 → 41.

- Device-pixel canvas and one shared responsive game factory; Phaser 3 has no DPR support of its own, so the field was previously upscaled and soft.
- Landscape-first presentation (orientation lock attempted, CSS rotation as the real mechanism). This also fixed a live control bug: `swipeToDir` already compensated for a rotation that did not exist, so a rightward swipe steered the snake upward.
- D-pad and boost button deleted; swipe to steer, hold the right half to boost, keyboard unchanged on desktop.
- Field tiled from the CC0 Kenney "Tiny Town" 16px sheet with seeded per-cell variants; `pixelArt` rendering. The old mow stripes ran one per gameplay column, which made the 30×30 lattice the most prominent thing on screen.
- Snakes are generated rather than sourced: pieces rasterise as a distance field around a centreline polyline, so a corner is a bent line and its elbow rounds. That answers the "turns at 90 degrees" complaint without touching the integer-only sim. One canvas atlas, 4 seats x 4 pieces, pooled sprites.
- Lobby rebuilt with the turf as a contained arena preview; marketing hero, symmetric stat grid (with its stale "1v1" claim) and CSS faux-3D snakes removed; interface emoji replaced by 16px-lattice `PixelIcon`s.
- Fixed a false "+3" celebration on bounty expiry and a shrink countdown that ran a 10s timer on an 11s event.

**Verified by browser screenshots** (Playwright + bundled Chromium against the client dev server). That pass caught four things no automated check could: viewport media queries take the wrong branch under the CSS rotation, so the stage is now a query container publishing `data-orientation`; safe-area insets had to be permuted to follow the transform; the Kenney flower tile read as a collectible on the field; and sprite outlines needed to be near-ink or the teal seat dissolved into the turf.

**Outstanding:** real-device Nimiq Pay QA (rotation and remapped safe areas on a notched phone), and pickups are still vector art on a pixel field — D47 stays in progress for that.

## Success metrics (D19) — tracking

## Deferred verification debt

- **Server Vitest worker errors:** the serialized server suite now passes cleanly; continue monitoring Vitest/Node/better-sqlite3 process handling in CI before release.

- ✅ Functionality: replay verification agreement is unit-tested; payout signing, explorer metadata, and unknown-submission handling are covered; p95 latency, match length, and crash-free operation remain device/deployment checks.
- ⏳ Usefulness/Repeat: N/A yet (no live users).
- ⏳ Marketing: no posts yet — start build-in-public cadence (D18: 2–3/wk).
- ⏳ Rewards pool: candidate selection, replay/attestation re-verification, payout intents, status lookup, transaction broadcasting, and explorer metadata are implemented; funding and on-chain deployment validation remain.
- ⏳ Rubric self-score: first 20-item self-score at W2 milestone.
