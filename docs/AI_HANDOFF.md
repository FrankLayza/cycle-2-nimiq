# AI_HANDOFF — Competitive Snake (Nimiq Mini App)

**Handoff written:** 2026-08-20 · **Next session should start here.**

Read, in order: `docs/AI_HANDOFF.md` → `docs/lifecycle/INDEX.md` → `docs/PROJECT_PROGRESS.md` → `COMPETITIVE_SNAKE_GAME.md` → `architecture/ARCHITECTURE.md` (as needed).

---

## Where we are

The UI received a restrained premium polish pass: the Fresh Rink palette is slightly deeper and more legible, primary coral actions use shared lift/press feedback, and reduced-motion behavior remains supported. This is intentionally a UI-only change; gameplay and sim behavior are untouched.

Latest UI pass adds Nunito and motion tokens, render-only pellet particles, an animated lobby character, a frosted match HUD with timer/shrink readout, and shared Phaser rendering for Today's Run. Verification is currently blocked by Node EPERM resolving `C:\\Users\\USER` in this environment.

**W1 scaffold is done and green** (typecheck + 23 tests + client build pass). The game core is real: a deterministic shared sim with replay verification, an authoritative Colyseus match room proven by a two-client e2e, and a React/Phaser client that plays local bot matches in the rotated Nimiq-Pay-style viewport.

<<<<<<< HEAD
**Current milestone: W2 (Aug 24–30).** The Fresh Rink client UI, authoritative PvP snapshot rendering, responsive Today's Run flow, native result sharing, and code-split Lawn League Phaser renderer are implemented. Next priority is a real Nimiq Pay wallet/device pass and live data polish.
=======
**Current milestone: W2 (Aug 24–30).** Wallet SDK integration is implemented; room-code PvP is wired for deterministic 1v1. The client now defers PvP room joining past React StrictMode's development probe so a room creator cannot occupy both seats accidentally. Next priority is two-client device validation and the remaining Nimiq Pay pass.
>>>>>>> 187fbf7 (fix: fixed the snake rendering bug)

## State at handoff

- **Git:** wallet provider integration is committed as `ee974f7`; the SDK lockfile update and ongoing PvP client work are currently uncommitted.
- **Unresolved (human):** public repo + registration + Skool; Railway/Pages deploy; reward signer key (testnet) + tx-signing lib choice; D34 attestation signing needs the Nimiq lib before `/runs/verify` can drop the stub gate.
<<<<<<< HEAD
- **Known shortcuts:** server runs via `tsx`; Colyseus 0.16 remains pinned with `defineTypes()` schemas; wallet discovery and rotated controls still need real-WebView validation; `todayScore` remains a documented placeholder; exact collision-loss reasons are not exposed by sim state and should not be guessed in UI.
- **UI verification:** client typecheck and 2 client tests pass; production build is split into ~102 kB initial JS, ~324 kB gzip on-demand match chunk, and ~3.7 kB Today's Run chunk. Full repo verification is blocked by the existing Nimiq attestation type mismatch and verify API fixture failures.
=======
- **Known shortcuts:** server runs via `tsx`; Colyseus 0.16 remains pinned with `defineTypes()` schemas; PvP create/join-by-code is wired for deterministic 1v1, creator joins are deferred to avoid duplicate StrictMode connections, and dead final snakes remain visible; 3–4 player simulation is not yet implemented; Phaser art is placeholder; wallet discovery still needs real-WebView validation; `todayScore` remains a documented placeholder.
>>>>>>> 187fbf7 (fix: fixed the snake rendering bug)

## Immediate next actions (W2)

1. Nimiq wallet: provider lifecycle, explicit account access, fallback states, and `signWalletMessage()` are implemented. Validate them in Nimiq Pay and add the address to the HUD.
2. Wallet/daily APIs: `/wallet/register`, `/wallet/:address`, and `/leaderboard/today` are implemented. `/runs/verify` now verifies the Nimiq public key/signature and binds verified runs to wallet streak profiles.
3. Real-device pass in Nimiq Pay: rotation/resize events, safe areas, touch/swipe/d-pad/boost, native share sheet, and wallet approval states.
4. Feed live leaderboard/streak data into Today's Run and the lobby; add wallet identity to the match HUD.
5. Fix the server Nimiq attestation API usage and update cryptographic test fixtures so full repo typecheck/tests are green.
6. Sim: `todayScore` formula tuning + verify; then bump `SIM_VERSION` if it changes (golden tests will force this). A loss-reason contract would also require an intentional versioned sim change.

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
