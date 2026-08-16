# Phase 2 (Week 2): Multiplayer PvP, Wallet Identity & Daily Mode

**Target Window:** Aug 24 – Aug 30, 2026  
**Status:** **CURRENT ACTIVE 🟡**  
**Milestone Goal:** Real Nimiq wallet identity, playable client-side room-code PvP, "Today's Run" daily flow with cryptographic attestation, Lawn League visual assets, and first real-device pass in Nimiq Pay.

---

## 1. Objectives & Task Breakdown

### Task 2.1 — Nimiq Wallet Identity (`packages/client`)
- [ ] Replace `packages/client/src/wallet/stub.ts` with real Nimiq web provider `init()`.
- [ ] Implement silent, read-only wallet connection on app load (D7: never blocks the first free-play match).
- [ ] Display truncated Nimiq address / avatar in the lobby and HUD.
- [ ] Handle disconnected and fallback states gracefully.

### Task 2.2 — Client-Side Room-Code PvP Networking (`packages/client` & `packages/server`)
- [ ] Wire `packages/client/src/net/client.ts` to connect to live Colyseus rooms (`joinOrCreate('match', { mode: 'pvp', code })`).
- [ ] Add Lobby UI for:
  - Generating / displaying 4-character room codes.
  - Entering room codes to join friends.
  - Deep-link support via `/?room=CODE` URL query parameter.
- [ ] Mirror Colyseus server schema on the client and stream real-time inputs.
- [ ] Implement tick interpolation in Phaser to smoothly render remote snake movements.

### Task 2.3 — "Today's Run" Client Flow & Attestation (`packages/client` & `packages/server`)
- [ ] Fetch daily challenge parameters (date, seed, reward tiers) from `GET /api/v1/run/today`.
- [ ] Execute solo seeded run on the client, recording per-tick inputs (`AppliedInput[][]`).
- [ ] Implement cryptographic attestation signing using Nimiq wallet (D34: sign `runId + date + seed + score`).
- [ ] Submit signed run to `POST /api/v1/runs/verify` and display rank/results.
- [ ] Update server `runs.ts` to cryptographically verify the Nimiq signature against the sender address.

### Task 2.4 — "Lawn League" / "Fresh Rink" Visual & Audio Polish (`packages/client`)
- [ ] Replace Phaser placeholder geometric rectangles with custom 2D cartoon snake sprites, heads, eyes, and turning segments.
- [ ] Add apple (normal) and golden star (bounty) pellet graphics.
- [ ] Implement particle effects: boost tail-burn smoke/sparks, pellet consumption pops, snake death bursts.
- [ ] Build React overlay screens using canonical Tailwind CSS v4:
  - **Settlement Card:** Match stats, winner declaration, rematch button, explorer link.
  - **Daily Leaderboard View:** Top ranked wallets, reward tiers, personal best.
  - **Wordle-Style Share Card:** Canvas-rendered image with player score and rank for social bragging.

### Task 2.5 — Real-Device Nimiq Pay Testing (`device / QA`)
- [ ] Test CSS-rotated 16:9 viewport inside the real Nimiq Pay mobile WebView on iOS and Android.
- [ ] Verify safe-area insets, notch avoidance, and dynamic header/navigation bars.
- [ ] Verify touch controls (left-thumb D-pad & swipe gestures + right-thumb Boost button) with zero input lag or gesture interference.
- [ ] Test 2-device live match over real network conditions.

---

## 2. Acceptance Criteria for Phase 2

- [ ] End-to-end 1v1 PvP match playable between two real devices via 4-character room codes.
- [ ] Real Nimiq wallet address detected automatically and bound to player profile.
- [ ] Today's Run can be played, signed with the Nimiq wallet, submitted, and verified by the server.
- [ ] UI and Phaser canvas adhere to the "Lawn League" aesthetic at a steady 60 FPS on mobile.
- [ ] All unit, integration, and golden tests remain green (`pnpm test`).
