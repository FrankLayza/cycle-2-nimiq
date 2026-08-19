# COMPETITIVE SNAKE GAME — Living Project Document

**Status:** Concept approved · Rewards agreed · Spike verified · Strategy approved · Design locked (Lawn League, D24) · Architecture approved (D25–D34) · **W1 scaffold DONE — monorepo green (typecheck + 23 tests incl. 2-client PvP e2e). Next: W2 — Nimiq wallet init, room-code PvP client wiring, real-device pass**
**Competition:** Nimiq Mini Apps Competition — Cycle II (Aug 17 – Sep 11, 2026)
**Internal submission target (T-5):** Sep 6, 2026
**Team:** 2 builders · **Budget:** ~200 team-hours · **Updated:** 2026-08-15

> This document is the durable source of truth for this project. Every agreed decision is recorded here and kept synchronized. When we agree on something new, this file is updated.

---

## 1. Concept & Positioning

- **Working name:** Competitive Snake (Nimiq Mini App).
- **One-liner:** A real-time, skill-based multiplayer battle (1v1, up to 4 players) designed for rapid 60–90 second matches.
- **Positioning:** An arcade battle where Nimiq Pay powers **verified, skill-based competition and rewards** — not a betting product. The wallet is the player's identity and the source of on-chain proof of skill.

---

## 2. Competition Context & Benchmark

**Judging (105 pts):** 20 items × 0–5 across four categories (25 pts each): Design & UX · Functionality · Usefulness & Originality · Marketing & Distribution. **+5 bonus for incentivizing NIM usage.**

**Cycle 1 winner benchmark (what we build to):**
1. All three winners were social/multiplayer/community-facing — no single-user utility placed.
2. Wallet interaction is the **core mechanic**, not a payment button.
3. **Server-side trust/verification** engineering is a differentiator (NimJump: replay verification; NimQuest: server-graded proofs).
4. Retention loops everywhere (streaks, quests, leaderboards, persistence).
5. Every winner has a one-sentence pitch + 60-second demo.

**Rules constraints that shape the design:**
- Skill-based games with clearly defined rules and prizes are permitted; randomness-dominated gambling is banned.
- No separate in-app wallets for user deposits; no hardcoded keys in the repo; no deceptive/misleading UX; no impersonating Nimiq Pay UI.
- Must be a working product on first try; public GitHub repo, MIT license; 250-word description; demo video encouraged.
- NIM support = +5 bonus; support USDT and/or NIM or be disqualified.

---

## 3. Core Mechanics & Arena Rules

- **Arena grid:** fixed 30×30, no wraparound — walls are fatal.
- **Shrink zone:** boundary contracts every 10–12 seconds (scaled for 60–90s matches) to prevent camping.
- **Pellets (MVP):**
  - Normal: +1 length, +1 score.
  - Bounty: +3 length, +1 boost charge (spawns periodically).
- **Movement:** base tick identical for all snakes (~100–120 ms). Boost doubles speed (~60 ms tick) while burning 1 tail segment per second.
- **Collisions (server-authoritative):**
  - Head-on: longer snake survives; shorter eliminated. Ties resolve by momentum (the snake that turned most recently loses).
  - Body: hitting an opponent's body kills the attacker; defender gains +3 length.

---

## 4. Viewport, Orientation & UI

- **Orientation:** full landscape view inside Nimiq Pay's portrait-locked container using a **CSS-rotated viewport** (`transform: rotate(90deg)` in `@media (orientation: portrait)`).
- **Canvas:** centered 16:9 arena. **Left thumb:** on-screen D-pad + swipe zone. **Right thumb:** large Boost button.
- **Top header:** pot/reward value, alive player count, shrink timer.
- **Fallback:** auto-adapts to normal landscape in desktop/external browsers.

---

## 5. Rooms & Anti-Friction Flow

- **Room access:** 4-character room codes (e.g. `7X9K`) inside the lobby; web URL fallback `/?room=7X9K`.
- **Cold start:** if no opponent joins public matchmaking within 5 seconds, an **AI bot** fills the slot.
- **Late arrivals:** full 1v1 rooms enter **Spectator Mode**.
- **Anti-sybil:** private/custom room results excluded from public leaderboards; leaderboards restricted to public, randomized matchmaking.

---

## 6. Reward System — ✅ AGREED (the reframe)

**Principle: the house never holds player funds. Players can only ever win, never lose.**

### Layer 1 — Free-to-play (default)
- Unlimited matches; wallet **connection only** (read-only address via Nimiq Pay injected provider — no signing, near-instant inside the app).
- Connection attributes matches to a wallet (feeds the scored "unique wallet users" metric) and enables payouts.

### Layer 2 — Skill-based NIM rewards (competition-visible)
- **We seed a small real-NIM reward pool** held by our own server-side signer (env secret — our funds, never user deposits). The pool only ever pays OUT.
- **Payouts (clearly defined, skill-determined, publicly documented):**
  - Daily leaderboard: 1st 50 NIM · 2nd 30 · 3rd 20 · 4–10: 5
  - Weekly leaderboard: 1st 300 NIM (larger, aggregate)
  - Streaks: 7 consecutive play days → badge + small NIM bonus
- **Verification before payout:** every score is a **server-side replay** of the player's recorded input log against the deterministic simulation. Replay must reproduce the score, or the run is invalid. (NimJump's trust architecture.)
- **Settlement:** at day/week close, server signs a real NIM transaction to the winner's wallet; in-app victory card with transaction hash + explorer link.
- **Anti-sybil:** public matchmaking only, one eligible account per wallet, verified replays, capped daily payouts per wallet.

### Layer 3 — Testnet stakes (demo, zero real money)
- **"Claim free testnet NIM"** button in lobby (Nimiq Pay faucet: 110,000 test NIM per request).
- Players stake e.g. 1,000 **test** NIM each; both confirm "Ready" in the lobby.
- Winner receives the pot via a **real on-chain testnet transaction** — settlement card + hash + testnet explorer link.
- Clearly labeled TESTNET everywhere. This preserves the staked-match experience and doubles as a live test of future real-money settlement code.

### Worked example
1. Play 5 free matches; best verified score 12,400.
2. Daily board locks 23:59 UTC → ranked 3rd.
3. Server replays run ✓, sybil check ✓ → 20 NIM sent from our pool to wallet; card shows hash + explorer link.
4. 7 consecutive days → streak badge + 10 NIM.
5. Judge toggles testnet, claims faucet NIM, plays a staked match, wins 2,000 test NIM, sees on-chain settlement hash.

### Why this shape
- Gambling carve-out satisfied: outcomes skill-determined, rules published, users cannot lose money.
- +5 NIM bonus: rewards are paid in NIM → literally incentivizes NIM usage.
- "Nimiq integration is core": wallet identity + on-chain verified rewards are the product.
- Marketing items: daily leaderboard is a built-in sharing hook; reward rules make the 250-word description write itself.

---

## 7. Technical Stack (finalized — D13)

- **Client:** React + TypeScript + Vite + Phaser 3 (canvas rendering). Rotated landscape container + overlay HUD/controls (spike-proven, D11).
- **Server:** Node.js + TypeScript + **Colyseus** (authoritative rooms, 10–12 Hz tick) + **Fastify** REST (leaderboards, rewards, Today's Run seed).
- **Storage:** SQLite (better-sqlite3) — users, verified runs, leaderboards, streaks, payouts.
- **Shared core:** a **pure deterministic TS sim** (spike-proven: integer math, seeded RNG) as the single source of truth used by client, server verification, and replay API.
- **Deploy:** Railway/Fly.io for the persistent WebSocket server (NOT serverless) + static hosting for the client.
- **Wallet:** Nimiq provider `init()` for identity; server-side reward signer (env secret) paying out our seeded pool; testnet faucet for the stakes demo.
- **Post-match:** settlement card with stats, transaction hash, explorer verification, rematch.

---

## 8. Decision Log

| # | Decision | Status |
|---|---|---|
| D1 | Direction: real-time competitive snake (Concept B) chosen over daily-verified async (Concept A) — user preference, refined | ✅ Approved |
| D2 | **Rewards reframe:** cut real-money stakes + escrow + house cut from competition path → free-to-play + seeded NIM rewards + testnet-only stakes | ✅ Approved |
| D3 | No "Double or Nothing" rematch mechanic (gambling optics) | ✅ Approved |
| D4 | No house cut — rewards distributed 100% (or pool-based, never rake) | ✅ Approved |
| D5 | Bots: free-play only, always labeled (never in staked/real-reward matches) | ✅ Approved |
| D6 | Private rooms excluded from public leaderboards; leaderboards = public matchmaking only | ✅ Approved |
| D7 | First-load flow = tap Play → instant free match; wallet/stakes are tier 2 (60-second onboarding item) | ✅ Approved |
| D8 | Rewards paid in **NIM** (not USDT) for the +5 bonus and native feeless settlement | ✅ Approved |
| D9 | Spike executed (rotation + input mapping + replay determinism) — results in §12 | ✅ Done |
| D10 | Real-money stakes deferred to post-competition (requires proper custody/contract work) | ✅ Deferred (intentional) |
| D11 | **Layout rule:** HUD/controls overlay the canvas absolutely — in-flow layout distorts the canvas and breaks input mapping (found in spike) | ✅ Approved |
| D12 | **Spawn separation:** snake spawn positions/directions must guarantee early separation (default spawn causes instant head-on) | ✅ Approved |
| D13 | **Stack:** React+TS+Vite+Phaser (client) · Node+TS+Colyseus (authoritative rooms) + Fastify REST · SQLite · Railway/Fly.io + static hosting · **shared pure-TS deterministic sim** as single source of truth | ✅ Approved |
| D14 | **MVP multiplayer:** room-code PvP + always-available bots; public random matchmaking = stretch (W4 only) | ✅ Approved |
| D15 | **Today's Run:** daily shared-seed challenge, best verified run per wallet → daily leaderboard + rewards. Anti-sybil by construction (one entry/wallet, replay-verified, identical conditions = pure skill). **Supersedes D6** (leaderboards no longer depend on matchmaking) | ✅ Approved |
| D16 | **W3 scope gate (Sep 1):** feature-freeze — anything not working goes to the roadmap; stretch list pre-agreed | ✅ Approved |
| D17 | **Reward schedule:** daily top-3 (30/20/10 NIM) + weekly top-1 (150 NIM) + streak bonus (7-day = 10 NIM). Amounts are placeholders; pool is small and ours | ✅ Approved |
| D18 | **Marketing budget:** ~25% of team time (~12h/wk combined); 2–3 build-in-public posts/wk; all Sip & Ship calls; early-access push W3 | ✅ Approved |
| D19 | **Success metrics** (§16) + weekly 20-item rubric self-score, target ≥90/105 at submit | ✅ Approved |
| D20 | **Today's Run mechanic approved** by user after explanation (2026-08-15) — it was proposed by AI as the fair/anti-sybil reward-ranking mechanism, not part of the user's original spec | ✅ Approved |
| D21 | **Design direction = B "Fresh Rink"** (bright, friendly, trustworthy) — user rejected neon/dark-crypto styles as "AI slop"; colorful approach preferred | ✅ Approved |
| D22 | **Wireframe set (5 screens)** produced in Fresh Rink — `design/wireframes.html`. Screen flow locked: Lobby → Match → Settlement → Share · Today's Run from Lobby · first-run auto-starts instant bot match (onboarding <60s). Working title placeholder "SNAKE RINK" — naming open | ✅ Done |
| D23 | **Match art direction:** green grass arena · well-designed 2D cartoon snakes (characters, not rectangles) · high-fidelity Match UI. Principle (user): "any concept can be a good game with the right design" → design quality is the differentiator, targeted at the scored First Impression + Visual Design items | ✅ Approved |
| D24 | **Visual concept selected = A · Lawn League** (sunny, glossy, playful; daisies; apples + golden stars; bouncy motion). Implementation spec: `design/match-scene-spec.md` | ✅ Approved |
| D25 | **Monorepo:** npm workspaces — `packages/sim` (pure deterministic sim, zero deps) · `packages/server` (Fastify + Colyseus + SQLite) · `packages/client` (Vite + React + Phaser). Dependency direction: server→sim, client→sim only | ✅ Approved |
| D26 | **Single-port server:** Colyseus attaches to Fastify's http server (REST `/api/v1/*` + WS `/colyseus` same origin); client is separate static hosting | ✅ Approved |
| D27 | **Input protocol:** per-tick applied inputs = authoritative verification log; missing ticks repeat last input; PvP is server-authoritative by construction | ✅ Approved |
| D28 | **Today's Run = solo seeded run** (no opponent — D5-clean: no bot in rewarded modes). Arena fully pre-derived from the daily seed (pellet schedule, shrink schedule, spawns) = identical conditions for all. Score = pellets + length + survival. **Render-only ghost** of the daily #1 replayed from its stored log | ✅ Approved |
| D29 | **DB schema** (SQLite/WAL): `runs` with `UNIQUE(day, log_hash)` — log-copy rejection; `payouts` idempotent (one tx per run) | ✅ Approved |
| D30 | **Deployment:** Railway (server, volume `/data` for SQLite, single port, cron via scheduled job + admin token) · static client host-agnostic (Cloudflare Pages/Netlify/competition hosting) · CORS allowlist · GitHub Actions CI/deploy | ✅ Approved |
| D31 | **Sim determinism rules:** tick-indexed only, integer state, seeded RNG with context separation, arena pre-derived from seed, `SIM_VERSION` gate + golden-hash regression tests | ✅ Approved |
| D32 | **Payouts:** cron 23:55 UTC daily + weekly Sunday; re-verify + attestation + idempotency before signing; testnet first, mainnet after | ✅ Approved |
| D33 | **Testnet stakes** = extension point on room/API only (stretch, W4) — no MVP build | ✅ Approved |
| D34 | **Today's Run submission requires a signed attestation** (one sign per entry: runId+date+seed+score — NimQuest pattern). Prevents input-log copying; free-play/PvP stay sign-less | ✅ Approved (user confirmed 2026-08-15) |
| D35 | **Scaffold runtime:** server runs via tsx (source-mode, incl. Railway); sim + server ship as TS source with no build step in W1; client via Vite (bundles the sim). Zero build orchestration | ✅ Done |
| D36 | **Colyseus 0.16 ecosystem pinned** (colyseus, @colyseus/core, @colyseus/schema, @colyseus/ws-transport 0.16.x) to match the colyseus.js 0.16 client; state schemas via decorator-free `defineTypes()` + constructor assignment (transpiler-agnostic) | ✅ Done |
| D37 | **W1 e2e verified:** two Colyseus clients join a room-code PvP match → countdown → playing → finished with identical authoritative state; server tick loop drives the shared sim (D27 input log captured) | ✅ Done |
| D38 | **W1 shipped `/api/v1/runs/verify`** (replay + `UNIQUE(day, log_hash)` dedupe + attestation gate) and the SQLite schema — ahead of the W2 roadmap | ✅ Done |
| D39 | **Client W1 = local bot matches** (spike path: client owns the sim) + render-only Phaser scene + rotated overlay (D11); room-code PvP client wiring deferred to W2 per roadmap | ✅ Done |
| D40 | **W2 UI implementation = Fresh Rink application shell + code-split Lawn League renderer.** Lobby, match HUD/controls/result/share, and Today's Run states are mobile-first with safe-area handling, 44px controls, restrained motion, and reduced-motion fallbacks. Phaser/Today's Run load on demand; initial app JS is ~102 kB gzip. Exact collision-loss reasons remain deferred until the authoritative sim exposes a cause via a deliberate versioned contract. | ✅ Done |

---

## 9. Cut / Deferred (MVP scope)

- Danger pellets and starvation timers (shrink zone handles camping).
- Slower movement for longer snakes (avoid punishing winners).
- Real-money stakes/escrow (deferred — see D10).
- "Double or Nothing" rematch (removed — see D3).

---

## 10. Risk Register

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| Rotated viewport breaks input mapping in Nimiq Pay WebView | Med | High | **De-risked in browser (spike §12)** — rotation + remapping verified 6/6; real-device WebView test still required before architecture lock |
| Real-time verification complexity (anti-cheat on live streams) | Med | High | Server-authoritative Colyseus + replay verification for rewards; keep match tick simple |
| Cold start (empty arena) | Med | High | Bots fill after 5s; spectator mode; free-play instant match |
| Gambling optics | Low (post-reframe) | Critical | Reframe approved (D2–D4); testnet clearly labeled |
| Scope vs ~200 team-hours | Med | High | MVP cuts (§9); spike-first; weekly scope review |
| Random pellet spawns vs "skill-determined" rule | Low | Med | Document rules clearly; keep randomness non-decisive; state skill case in description |
| Real-time desync (network/WebView) | Med | High | Grid movement = naturally reconciliable; deterministic shared sim; device test in W2 |
| Today's Run farming (multiple wallets) | Med | Med | Best-of-day per wallet + replay verification + per-day caps |
| Reward signer compromise | Low | Med | Small pool, env-secret signer, manual review of first payouts |
| Marketing time underestimated (25 pts of rubric) | Med | High | 12h/wk reserved (D18), content plan, calls in calendar |
| W3 scope gate ignored | Med | High | Feature-freeze enforced (D16); stretch list pre-agreed |
| Cycle II date discrepancy (site: Aug 17–Sep 11 vs blog: Aug 24–Sep 18) | Med | Low | Verify on Registration Dashboard at registration |

---

## 11. Roadmap (Cycle II) — detailed

- **W1 (Aug 17–23):** ✅ **DONE (2026-08-15).** Monorepo scaffolded; sim ported with golden/determinism/replay tests green; Colyseus room + tick loop + room codes + `/health`; rotated React/Phaser shell with local bot play; CI + deploy workflows; **2-client PvP e2e green**. Remaining W1 items: public GitHub repo + registration + Skool, Railway + Pages deploy wiring (needs credentials), Nimiq tx-signing spike. Call Aug 19.
- **W2 (Aug 24–30):** Mechanics polish + **first real-device pass in Nimiq Pay** (rotation, safe areas, touch). Room-code PvP, spectator-lite, replay capture + verification API, Today's Run, leaderboard, streaks. **Milestone: end-to-end playable in Nimiq Pay on 2 devices, testnet.** Call Aug 26.
- **W3 (Aug 31–Sep 6):** **Early access — submissions go public.** Fix feedback, reward pool live, marketing push, demo-video draft. **Scope gate Sep 1: feature-freeze (D16).** Call Sep 2.
- **W4 (Sep 7–11):** **Submit Sep 6–9 (internal target Sep 6, hard deadline Sep 11 23:59).** Polish D&UX items (onboarding <60s, error handling, load speed), README + 250-word description, final demo video, final community push. Call Sep 9.

---

## 12. Spike Results (2026-08-15)

Full detail: `spike/SPIKE_REPORT.md`. Prototype: `spike/index.html` (self-contained, zero-dependency).

**Verified in browser (all ✅):**
- CSS-rotated 16:9 landscape container fills the portrait viewport.
- **Input remapping round-trip 6/6** — clicking where a cell/pellet appears maps to the correct grid cell, corners included.
- Swipe directions feel visually correct in rotated mode (screen-right = game-up).
- **Replay determinism:** same seed + same input log reproduces the match byte-identically — the anti-cheat/reward-trust core is proven.
- Recorded inputs meaningfully drive outcomes (replay differs without the log).
- Shrink boundary (30→28 at tick 100), pellet/bounty consumption, boost tail-burn, head-on/body collisions, 160-tick match.

**Findings (fixed or flagged):**
- 🐛 **Canvas distortion broke input mapping** — HUD/controls were in-flow inside the 16:9 box. Fixed: they now overlay the canvas absolutely (D11). Mandatory layout rule for the real build.
- 🐛 **Default spawn forces instant head-on** — spawn layout must guarantee early separation (D12).

**NOT yet verified (device-dependent):**
- ⏳ Behavior inside the actual Nimiq Pay WebView: rotation/resize events, safe areas/notches, touch delivery — real-device pass required before architecture lock.
- ⏳ Colyseus authoritative 2-player room: tick loop, input buffering, latency — scaffold + device test required.

**Next spikes:** (1) Colyseus room with authoritative tick + input-log capture; (2) real-device pass in Nimiq Pay.

---

## 13. Submission Notes

- Public GitHub repo, MIT license, no hardcoded secrets.
- 250-word description: what it does, who it's for, how it uses Nimiq Pay — must state the reward rules ("clearly defined rules and prizes").
- Demo video (encouraged; counts toward storytelling).
- Week 3 early access = submissions go public for community testing.

---

## 14. Strategy — Vision, Mission & MVP (approved)

**Vision:** Make Nimiq Pay the home of the quickest, fairest competitive snack on mobile — a 60-second skill battle anyone can play, where every win is proven on-chain.

**Mission:** A real-time 1v1 snake battle inside Nimiq Pay: instant free-play vs bots or friends, a daily shared challenge (Today's Run), verified leaderboards, and small skill-based NIM rewards — polished and demo-ready by Sep 6.

**MVP core loop:** Open app → tap Play → in a match in <60s (wallet connects silently). Play vs bot (always available) or friend (4-char room code). Today's Run: same seeded challenge for everyone, best verified run of the day counts. Streaks, share card, daily leaderboard, small NIM payouts.

| Layer | In MVP | Stretch (W4 only if solid) |
|---|---|---|
| Game | Sim + canvas, shrink, boost, bounty, collisions (spike-proven) | Skins, animation polish |
| Opponents | Bot always-available; PvP via room codes | Public random matchmaking |
| Trust | Replay capture + server verification (spike-proven) | Spectator full mode |
| Rewards | Today's Run leaderboard + daily payouts, streaks | Testnet stakes mode, weekly board |
| Marketing | Build-in-public, calls, share cards, early access | Community tournament event |
| Deferred forever | Real-money stakes, USDT, 4-player, danger pellets | — |

---

## 15. Feature Priority Matrix

- **Implement now:** core loop · bot · rotated overlay UI · wallet identity · room-code PvP · Today's Run + replay verify · leaderboard + streaks + share card · reward payouts · deploy + MIT repo · marketing cadence.
- **Evaluate carefully:** public matchmaking · testnet stakes mode · 4-player/spectator · weekly board · USDT.
- **Reject / defer:** real-money stakes · double-or-nothing · house cut · danger pellets · longer-snake slowdown · profiles/auth beyond wallet.

---

## 16. Success Metrics (D19)

- **Functionality:** 100% replay-verification agreement; p95 match latency ≤ 1 tick; matches land in 60–90s; zero crashes.
- **Usefulness/Repeat:** ≥3 sessions/wk per active wallet; streak D1→D2 retention ≥40%.
- **Marketing (25 pts):** ≥150 distinct wallet users by Sep 6 (the scored item); ≥6 build-in-public posts; all 4 Sip & Ship calls; 1 community tournament.
- **Rewards:** pool fully distributed, zero payout disputes.
- **Rubric:** weekly self-score on all 20 items; target ≥90/105 at submit.

---

## 17. Design — "Fresh Rink" (D21)

**Direction:** Bright, friendly, trustworthy arcade. Light background, playful rounded shapes, high contrast. Strongest "trustworthy first impression" play for a payment app. **Design principle: no neon/dark-crypto default — user explicitly rejects it as AI slop.**

**Visual system:**
- **Vibe:** Wordle/Duolingo-meets-arcade — safe, approachable, energetic.
- **Color:** warm off-white bg (#f7f5f0) · coral vs teal snakes · lemon pellets · deep-ink text for contrast.
- **Type:** rounded grotesque (friendly), chunky numerals for scores.
- **Motion:** springy/bouncy, confetti on win, calm (no screen-shake); 60fps canvas.

**60-second onboarding (scored item):** 0–3s splash + "TAP PLAY" · 3–10s tap Play → silent wallet connect → instant bot match · 10–60s in-match with hint overlay ("hold to boost!"), first-death result card with one-tap rematch · wallet sign-in, room codes, Today's Run, rewards all tier-2 (never block first match).

**Component system:** HUD bar (score/alive/shrink) · lobby (play / room code / Today's Run) · room-code entry · settlement card (stats + tx hash + rematch) · share card (rank image) · streak/badge strip.

**Accessibility:** high contrast + non-color-only cues (distinct pellet shapes) · reduced-motion respected · hit areas ≥44px · keyboard on desktop.

**Next design steps:** wireframes for all screens → explore multiple visual concepts (never implement the first) → human selection → implement.

---

## 18. Wireframes (D22)

Full mockup: `design/wireframes.html` (self-contained, phone frames in Fresh Rink palette).

**Screens:**
1. **Lobby** — wordmark (placeholder "SNAKE RINK", naming open) · wallet chip (address + NIM balance) · hero + tagline · **Play (instant match)** primary · Room code + Today's Run secondary · 7-day streak strip · rewards teaser chip.
2. **Match (in-game)** — rotated landscape board in portrait container · HUD pills (YOU score · shrink timer · RIVAL score) · dashed shrink bounds · d-pad + BOOST (overlay controls, spike rule D11) · swipe-to-steer · first-run hint pill "hold BOOST to speed up!".
3. **Today's Run** — date + seed + "identical arena for all" · teal play CTA · podium rewards (30/20/10 NIM) · verified leaderboard with masked wallets + highlighted "you" row · share my rank.
4. **Settlement card** — win/lose/draw · stats (score/length/boosts) · **verified on-chain tx pill** (hash + explorer) · Rematch primary · Lobby + Share secondary · Today's Run rank chip (+NIM).
5. **Share card** — Wordle-style generated image: rank ("3rd of 17"), score, ✓ server-verified pill, streak, masked handle, wordmark footer · auto-copy + channel targets.

**Flow:** Lobby → Match → Settlement → Share (one tap) · Lobby → Today's Run → Match → Settlement + rank → Share. **First-run:** splash → auto-start instant bot match → hint in-match → post-match card (scored onboarding <60s).

**Open items:** app name (placeholder SNAKE RINK) · exact wallet address masking format · share-card layout variants for testing.

---

## 19. Visual Concepts — Match Screen (D23 · awaiting selection)

Full mockups: `design/concepts.html`. Art direction per D23: green grass arena, designed 2D snake characters, high-fidelity Match UI. Three moods proposed — **selection is the human gate; never ship the first concept** (Phaser renders interpolation/particles/lighting on top of whichever wins):

| Concept | Mood | Grass | Snakes | Pellets | Motion | Fit |
|---|---|---|---|---|---|---|
| **A · Lawn League** ✅ **SELECTED (D24)** | sunny · glossy · playful | vibrant mowed lawn + daisies, soft vignette | glossy rounded, big friendly eyes, tongues | apples + golden stars | bouncy squash, confetti on win | **Best balance** — approachable + real-game quality |
| **B · Meadow Match** | soft · pastel · calm | sage/mint meadow + wildflowers | flat matte vector (mint + peach), minimal gloss | berry clusters + peaches | gentle ease-in-out | Strongest trustworthy/calm first impression |
| **C · Picnic Pitch** | bold · cartoon · snacky | saturated lawn + picnic-blanket corners, confetti | comic-style, thick outlines + white dashes | watermelon, cherries, lemon | snappy punchy | Most distinctive/memorable, best demo energy |

---

## 20. Phaser Match Scene — Implementation Spec (D24)

Full spec: `design/match-scene-spec.md`. Key points:
- **Render-only Phaser** — sim (shared pure-TS) is the single source of truth; Phaser never writes back (determinism guardrail).
- 1280×720 logical canvas in the rotated DOM shell; HUD/d-pad/BOOST = React DOM overlay (D11); input via spike's rotation-compensated mapping.
- Snakes = stamped rounded segment sprites + dedicated head sprites (eyes/tongue/blush), lerp interpolation between 110ms ticks, squash-on-turn, boost trails (pooled), no screen-shake.
- Grass tile + seeded daisies (render-only, seeded by match seed) + painted dashed shrink line + vignette.
- One texture atlas; <50 draw calls; particles pooled; target 60fps + <400 kB gzip initial; reduce-motion respected.
- Acceptance: M1–M5 (smooth interpolation, input round-trip 6/6, budget, render-only determinism, state-sync).

---

## 21. Architecture (D25–D34)

Full blueprint: `architecture/ARCHITECTURE.md` — the W1 scaffold spec.

- **Monorepo:** `packages/sim` (pure deterministic sim, zero deps) · `packages/server` (Fastify + Colyseus + SQLite/WAL) · `packages/client` (Vite + React + Phaser).
- **Sim module (the heart):** tick-indexed + integer-only + seeded RNG (context-separated) · arena pre-derived from seed · `SIM_VERSION` gate · golden-hash tests (D31). Public API: `createRun` / `step` / `replay` / `getArena`.
- **Colyseus `match` room:** 2 seats + spectators · 110ms authoritative tick · input log = per-tick applied inputs (D27) · bots only in free-play (D5) · 4-char Crockford codes · rematch without stakes.
- **REST `/api/v1`:** health · run/today · runs/verify (replay + attestation) · daily/weekly leaderboards · streaks · rewards/schedule (published rules) · payouts/:runId · rooms · admin payouts/stats.
- **Today's Run loop (D15/D28/D34):** fetch seed → solo run locally → sign attestation → verify → leaderboard + rank → 23:55 UTC payout job pays top-3 from our pool (D17/D32).
- **DB:** wallets, runs (`UNIQUE(day, log_hash)`), leaderboard, payouts (idempotent), rooms.
- **Deploy:** Railway (volume `/data`, single port, cron + admin token) + static client (host-agnostic) + CORS allowlist + GitHub Actions.
- **W1 spikes flagged:** Nimiq tx-signing lib + testnet faucet (payout prerequisite).

**W1 scaffold checklist** (§11 of the architecture doc): repo + sim port with golden tests green → server skeleton (room tick loop, codes, /health) → client shell (rotated container, wallet stub, Phaser scene) → deploy skeleton → tx-signing spike.
