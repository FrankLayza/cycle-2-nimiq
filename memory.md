# memory.md — Project memory

Quick orientation for any AI model dropped into this repo. For full state, read
`docs/AI_HANDOFF.md` → `docs/PROJECT_PROGRESS.md` → `COMPETITIVE_SNAKE_GAME.md` → `architecture/ARCHITECTURE.md`.

---

## What this is

**Competitive Snake** — a real-time, skill-based snake battle for **2–4 players** built as a **Nimiq Pay
Mini App** for the **Nimiq Mini Apps Competition — Cycle II** (Aug 17 – Sep 11, 2026). Internal submission
target **Sep 6 (T-5)**. Wallet = player identity; rewards are skill-based, replay-verified, and paid
from a team-seeded pool — **not** a betting product.

## Source of truth (in order)

1. `COMPETITIVE_SNAKE_GAME.md` — living project doc: concept, decisions (D1–D47), rewards, roadmap, risks.
2. `architecture/ARCHITECTURE.md` — build blueprint (D25–D34).
3. `docs/lifecycle/` — lifecycle breakdown for each phase:
   - [`PHASE_1_SCAFFOLD.md`](docs/lifecycle/PHASE_1_SCAFFOLD.md) — W1 scaffold (Done ✅)
   - [`PHASE_2_MULTIPLAYER_WALLET.md`](docs/lifecycle/PHASE_2_MULTIPLAYER_WALLET.md) — W2 PvP, Wallet & Daily Mode (Current 🟡)
   - [`PHASE_3_REWARDS_EARLY_ACCESS.md`](docs/lifecycle/PHASE_3_REWARDS_EARLY_ACCESS.md) — W3 Automated Payouts & Early Access (Upcoming ⏳)
   - [`PHASE_4_HARDENING_SUBMISSION.md`](docs/lifecycle/PHASE_4_HARDENING_SUBMISSION.md) — W4 Production & Submission (Upcoming ⏳)
4. `docs/AI_HANDOFF.md` — where the last session ended and what's next.
5. `docs/PROJECT_PROGRESS.md` — milestone status + success metrics.

## Repo layout

```
packages/
├── sim/       @snake/sim     — pure deterministic simulation (single source of truth, ZERO runtime deps)
├── server/    @snake/server  — Fastify REST + Colyseus authoritative rooms + SQLite (WAL), single port
└── client/    @snake/client  — Vite + React + Phaser (render-only) mini app
.github/workflows/            — ci.yml (typecheck/lint/tests/build) + deploy.yml (Railway + static host)
```

Dependency direction (enforced): `server → sim` · `client → sim`. Client and server never import each other.

## Current state (2026-08-29)

- **W1 scaffold DONE + committed.** Sim ported with golden hashes locked; Colyseus room with tick loop;
  React/Phaser client. Suites: sim 16 · client 41 · server 45, all green.
- **W2 active.** The official `@nimiq/mini-app-sdk` is installed; silent `init()` + explicit
  `listAccounts()` identity, room creation/join, StrictMode-safe PvP, authoritative rendering,
  Today's Run signing, shared touch/keyboard controls, and payout status lookup are implemented.
  Real-device validation and production payout broadcasting remain.
- **PvP flow:** lobby can create a room through `POST /api/v1/rooms` and join by the generated 4-character
  code. PvP supports 2–4 active seats with deterministic four-lane spawns and `SIM_VERSION` 4. Late
  spectator joins are rejected; a player who dies remains connected and observes the survivors. Room admission
  rejects duplicate codes in-process, matches lock at start, unexpected disconnects pause for bounded reconnection,
  and consented/time-out forfeits are recorded as deterministic sim inputs.
- **Client is pixel art and landscape-first (D46/D47).** The field is tiled from the CC0 Kenney "Tiny
  Town" 16px sheet and Phaser renders with `pixelArt`. Snakes are *generated*, not sourced —
  `game/snakeSprites.ts` rasterises head/straight/corner/tail as a distance field around a centreline
  polyline, so corners round. The app presents landscape (native orientation lock attempted, CSS 90deg
  rotation as the real mechanism); the on-screen d-pad and boost button are gone in favour of
  swipe-to-steer plus hold-the-right-half-to-boost. Pickups are still vector art — the last art clash.

## Conventions & gotchas

- **Tooling:** pnpm 10 workspaces · Node 24 · TypeScript **5.9** (NOT 7 — breaks typescript-eslint) ·
  vitest 4 · Vite 8.
- **Colyseus pinned to 0.16** (0.16.25 core is a broken publish; 0.17 has no matching client lib).
  State schemas use `defineTypes()` + `declare` fields + constructor assignment — **never decorators**
  (default class-field semantics shadow the schema accessors; this bit us once already).
- **better-sqlite3 v13** ships prebuilt binaries (no build script; don't "fix" the install).
- **Server runtime = tsx** (source-mode; no build step). Production on Railway also runs `tsx src/index.ts`.
- **Sim rules:** tick-indexed, integer math, seeded RNG with context separation (arena/bot/effects),
  arena pre-derived from seed. `SIM_VERSION` gates every run; golden tests lock behavior. Version 4 includes
  the server-authored deterministic PvP forfeit input and avoids moving zero-velocity fixtures.
- **UI is Tailwind v4** (`@import "tailwindcss"` in `packages/client/src/index.css`, Fresh Rink palette
  defined via `@theme`). Per `agents.md` Rule 1, all UI must use **Tailwind v4 canonical class names**
  (see the rename table in `agents.md`) — never v3 aliases like `shadow`, `rounded`, `ring`,
  `bg-gradient-to-*`, or `*-opacity-*`.
- **Inside the landscape stage, use container variants (`@2xl:`), NOT viewport breakpoints (`sm:`/`lg:`).**
  On a portrait phone the shell is CSS-rotated to present landscape, so the device reports a 390px
  portrait viewport while the stage is 844px landscape. Viewport media queries — Tailwind's `sm:`/`lg:`
  and `@media (orientation: …)` alike — describe the device and therefore take the *narrow* branch on a
  *wide* stage. This is silent: it typechecks, builds, and passes tests while laying out wrongly.
  `.landscape-stage` sets `container-type: inline-size` so `@` variants measure the stage, and it
  publishes `data-orientation="landscape|portrait"` for the one thing a width query cannot express.
  Safe-area insets are likewise permuted on `.landscape-stage-rotated`, because the transform sends the
  stage's local top edge to the screen's right.
- **Look at UI changes in a browser.** Playwright plus the bundled Chromium works here: run
  `pnpm --filter @snake/client dev` and drive it with a short script. Several defects in the art pass
  (confetti-looking turf, decoration that read as collectibles, a snake that dissolved into the grass,
  the container-query bug above) were invisible to typecheck, tests, lint and the build.
- **Wallet integration:** `packages/client/src/wallet/provider.ts` uses the official Mini App SDK. App
  load only initializes the provider; `listAccounts()` is called from explicit Connect because it opens
  a native confirmation. A typed `signWalletMessage()` wrapper is ready for Today's Run. Wallet access
  remains optional/non-blocking and still needs validation inside the Nimiq Pay WebView.
- **Wallet/daily APIs:** server exposes `/api/v1/wallet/register`, `/api/v1/wallet/:address`,
  `/api/v1/leaderboard/today`, `/api/v1/streaks/:wallet`, masked leaderboard wallets, and reward pool metadata. `/runs/verify` requires `{id, day, seed, reportedScore, attestation:
  {message, publicKey, signature}}`; the message must equal `snake-rink:today:{id}:{day}:{seed}:{score}`.
  Server verification now uses `@nimiq/core`; the public key must derive the submitted wallet address
  and the signature must verify the canonical message. Verified runs create/update wallet streak profiles.
- Today's Run attestation verification is cryptographically implemented with `@nimiq/core`.
  Server-side payout signing/broadcasting now uses `@nimiq/core` with a seeded pool signer,
  configurable fees, explorer URLs, and unknown-submission handling that prevents duplicate retries.

## Recent implementation

- Daily leaderboard contract is complete at `/api/v1/leaderboard/daily`, with `/today` retained as a compatibility alias, pagination, date/page validation, masked public entries, and explicit viewer metadata.
- Verification rank, public leaderboard rank, and payout candidate selection use the same deterministic best-run ordering (score, length, wallet, run ID).

## Recent implementation

- The deploy workflow now runs `pnpm lint` alongside typecheck, tests, and client build (`5baefe2`).
- Configured Railway deploy webhook failures now fail the deploy job instead of being ignored (`e8e410a`).
- CI and deploy now run the existing `@snake/client` Vitest suite before the client build (`f05676f`).
- Production configuration now fails fast on unsafe default secrets, missing `ALLOWED_ORIGINS`/`APP_URL`, invalid
  ports, fees, pool sizes, or network names (`1404a68`, corrected tests in `76c79cc`).
- Production configuration now also requires `REWARD_SIGNER_KEY` and rejects wildcard CORS (`c8e15b6`).

## Remaining implementation

1. Fund and validate the configured testnet reward signer in a real deployment; on-chain acceptance
   still requires human/deployment validation.
2. Weekly leaderboard and weekly settlement remain stretch scope, not MVP.
3. Nimiq Pay WebView validation: wallet connect/sign approval, rotation, safe areas, touch, share,
   and two-device PvP.
4. Live leaderboard/streak refresh and wallet identity in the match HUD; the server streak read API is available.
5. Node 24/pnpm 10 checks pass; server Vitest files are serialized because DB_PATH and the SQLite
   singleton are process-global. Run verification and admin settlement reject malformed or future
   UTC dates before doing seed, signature, or payout work.
6. Human release work: Railway/Pages credentials, competition registration/Skool, funded testnet
   reward wallet, demo video, and final submission QA. `LICENSE` and production README are present.
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
