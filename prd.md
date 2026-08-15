# PRD — Competitive Snake (Nimiq Mini App)

**Version:** 1.0 · **Status:** Approved (D1–D39) · **Competition:** Nimiq Mini Apps Competition — Cycle II
**Owner:** Team of 2 builders · **Deadline:** internal Sep 6 · hard Sep 11, 2026

> Product decisions here are the approved ones from `COMPETITIVE_SNAKE_GAME.md` — this is the
> product-facing requirements doc, not the source of truth for decisions.

---

## 1. Overview

- **One-liner:** A real-time, skill-based multiplayer snake battle (1v1, up to 4) with 60–90 second
  matches, where the Nimiq wallet is your identity and your skill is proven on-chain.
- **Positioning:** An arcade battle where Nimiq Pay powers **verified, skill-based competition and
  rewards** — not a betting product. The wallet is the player's identity and the source of on-chain
  proof of skill.
- **Vision:** Make Nimiq Pay the home of the quickest, fairest competitive snack on mobile — a 60-second
  skill battle anyone can play, where every win is proven on-chain.

## 2. Problem & opportunity

- Wallet apps need sticky, social, demonstrably useful mini-apps. The Cycle 1 benchmark shows
  winners are social/multiplayer, make wallet interaction the **core mechanic** (not a payment button),
  and engineer **server-side trust/verification** (replay/graded proofs).
- Snake is instantly understood, skill-capped, and compressible into a 60-second match — ideal for a
  quick-session mobile app inside a wallet.
- "Skill games with clearly defined rules and prizes" are permitted; randomness-dominated gambling is
  banned — our reward architecture (verified replays, seeded pool, no player funds) satisfies this.

## 3. Users & scenarios

- **The busy wallet user:** 60 seconds of play during a coffee break; instant bot match, no friction.
- **The friend group:** share a 4-char room code, quick 1v1 bragging rights.
- **The competitor:** plays Today's Run daily to climb the verified leaderboard and earn NIM.
- **The judge:** connects the wallet, plays free + testnet-staked matches, sees on-chain settlement.

## 4. Core loop

Open app → tap Play → **in a match in <60s** (wallet connects silently) → play 60–90s → result card →
one-tap rematch / share / Today's Run. Streaks, leaderboards and small NIM rewards pull you back daily.

### Game rules (MVP)

- **Arena:** fixed 30×30 grid, no wraparound — walls are fatal. Boundary shrinks every ~11s (stops at 12×12).
- **Movement:** identical base tick (~110 ms) for all snakes. **Boost** doubles speed while burning
  1 tail segment/second.
- **Pellets:** normal +1 length/+1 score · bounty +3 length/+3 score (periodic spawn).
- **Collisions (server-authoritative):**
  - Head-on: longer snake survives; equal → the snake that turned most recently loses; never-turned tie → both die.
  - Body: hitting an opponent's body kills the attacker; defender gains +3.
- **Bots:** fill empty slots after ~5s in free-play; **never** in rewarded modes; always labeled.

## 5. Modes

| Mode | In MVP | Rewarded |
|---|---|---|
| Instant bot match | ✅ | ❌ |
| Room-code PvP (4-char code, URL `/?room=CODE`) | ✅ | ❌ (excluded from public boards) |
| **Today's Run** — solo seeded run, identical arena for all, best verified run/day/wallet | ✅ | ✅ |
| Public random matchmaking | Stretch (W4) | — |
| Testnet stakes (free faucet NIM, real on-chain testnet tx) | Stretch (W4) | demo only |

## 6. Rewards (approved reframe — D2/D4)

**Principle: the house never holds player funds. Players can only ever win, never lose.**

1. **Free-to-play (default):** unlimited matches; wallet connection only (read-only, silent).
2. **Skill-based NIM rewards:** small team-seeded pool, paid OUT only, replay-verified:
   - Daily leaderboard: 1st 30 NIM · 2nd 20 · 3rd 10 (placeholders).
   - Weekly leaderboard + 7-day streak bonus (10 NIM).
   - Every score is verified by server-side replay of the submitted input log + signed attestation (D34).
3. **Testnet stakes (demo):** "Claim free testnet NIM" → stake 1,000 test NIM each → winner gets a real
   on-chain testnet transaction. Clearly labeled TESTNET.

## 7. UX & UI requirements

- **Design direction:** "Fresh Rink" → visual concept A "Lawn League" — bright, friendly, trustworthy
  arcade. No neon/dark-crypto. Warm off-white bg, coral vs teal snakes, lemon pellets, bouncy motion.
- **Viewport:** portrait-locked Nimiq Pay container; 16:9 landscape canvas via CSS rotation.
  Left-thumb d-pad + swipe; right-thumb BOOST. HUD/controls **overlay** the canvas (never in-flow).
- **Onboarding <60s:** splash → TAP PLAY → silent wallet connect → instant bot match with in-match hint.
- **Screens:** Lobby · Match · Today's Run · Settlement card (stats + tx hash + explorer link + rematch)
  · Share card (Wordle-style rank image).
- **Accessibility:** high contrast, non-color-only cues, ≥44px hit areas, keyboard on desktop,
  reduced-motion respected.
- **Performance:** 60fps on mid-range phones; <50 draw calls; initial bundle <400 kB gzip.

## 8. Technical requirements

- **One sim, everywhere** — pure deterministic TS module shared by client, server, and replay verifier.
  Integer math, seeded RNG, tick-indexed, `SIM_VERSION` gate, golden-hash regression tests.
- **Server-authoritative** for everything that matters: Colyseus rooms drive the sim; PvP outcomes and
  reward payouts require server-side replay verification.
- **Client is a dumb renderer** — Phaser reads sim state, never writes back.
- **Single-port server** (REST + WS) on Railway/Fly.io (persistent, not serverless); static client
  host-agnostic; CORS allowlist; no secrets in the repo.
- **Wallet identity:** Nimiq provider `init()` (read-only) for free play; server-side reward signer
  (env secret) pays the pool; testnet first, then mainnet.

## 9. Non-goals

- ❌ Real-money stakes / escrow / house cut ("Double or Nothing" removed — gambling optics).
- ❌ USDT rewards (NIM only, D8).
- ❌ Danger pellets, starvation timers, longer-snake slowdown.
- ❌ Profiles/auth beyond the wallet.
- ❌ Public random matchmaking in MVP (stretch).

## 10. Success metrics (D19)

- **Functionality:** 100% replay-verification agreement · p95 match latency ≤ 1 tick · matches 60–90s · zero crashes.
- **Retention:** ≥3 sessions/wk per active wallet · streak D1→D2 ≥40%.
- **Marketing (25 pts):** ≥150 distinct wallet users by Sep 6 · ≥6 build-in-public posts · all Sip & Ship calls.
- **Rewards:** pool fully distributed · zero payout disputes.
- **Rubric:** weekly 20-item self-score, target ≥90/105 at submit.

## 11. MVP acceptance criteria

- [ ] First match in <60s from app open (wallet silent).
- [ ] Bot match + room-code PvP playable end-to-end on 2 devices in Nimiq Pay.
- [ ] Today's Run: same arena for all; submitted score replay-verified; duplicate logs rejected; attestation required.
- [ ] Leaderboard + streak + share card + settlement card with tx hash.
- [ ] Daily payout job pays verified winners from the seeded pool (testnet → mainnet).
- [ ] Deployed (server on Railway/Fly, client on static hosting), public repo, MIT license, README + 250-word description.
- [ ] Demo video + build-in-public trail.
