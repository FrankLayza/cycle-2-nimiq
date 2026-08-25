# Phase 2 (Week 2): Multiplayer PvP, Wallet Identity & Daily Mode

**Target Window:** Aug 24 – Aug 30, 2026  
**Status:** **CURRENT ACTIVE 🟡**  
**Milestone Goal:** Real Nimiq wallet identity, playable client-side room-code PvP, "Today's Run" daily flow with cryptographic attestation, Lawn League visual assets, and first real-device pass in Nimiq Pay.

---

## 1. Objectives & Task Breakdown

### Task 2.1 — Nimiq Wallet Identity (`packages/client`)
- [x] Add the official `@nimiq/mini-app-sdk` and initialize it with `init()` + `listAccounts()`.
- [x] Silently initialize the provider on app load; request account access only from the explicit Connect action because `listAccounts()` requires native confirmation.
- [~] Display the truncated Nimiq address in the lobby; HUD identity/avatar remains.
- [x] Handle unavailable-provider, rejected, empty-account, and local-browser fallback states without blocking free play.
- [x] Add a typed `signWalletMessage()` wrapper for rewarded-mode attestations using the SDK's `sign()` API.
- [ ] Validate account discovery inside the real Nimiq Pay WebView on testnet.

### Task 2.2 — Client-Side Room-Code PvP Networking (`packages/client` & `packages/server`)
- [~] `joinOrCreate('match', { mode: 'pvp', code, wallet })` and live input sending are wired; complete room lifecycle/error handling remains.
- [x] Lobby can create a supported 2–4 player room via REST, display/join its generated 4-character code, enter a code manually, and read `/?room=CODE`.
- [~] Client schema mirror exists and inputs stream; consume authoritative state updates in Phaser.
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

- [ ] End-to-end 2–4 player PvP match playable between real devices via 4-character room codes.
- [ ] Real Nimiq wallet address detected automatically and bound to player profile.
- [ ] Today's Run can be played, signed with the Nimiq wallet, submitted, and verified by the server.
- [ ] UI and Phaser canvas adhere to the "Lawn League" aesthetic at a steady 60 FPS on mobile.
- [ ] All unit, integration, and golden tests remain green (`pnpm test`).

---

## 3. Current Remaining Work (2026-08-19)

1. Validate provider initialization, account permission, and message signing in Nimiq Pay; show the wallet identity in the match HUD.
2. Finish room creation, connection errors, waiting/countdown/result states, and authoritative Phaser rendering.
3. Add interpolation for remote movement and verify a complete two-device PvP match.
4. Build Today's Run recording, wallet message signing, submission, and server-side signature verification.
5. Replace placeholder game art, add settlement/leaderboard/share views, and complete mobile safe-area/touch QA.
