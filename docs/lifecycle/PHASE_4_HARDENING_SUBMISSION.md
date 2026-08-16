# Phase 4 (Week 4): Production Hardening, Submission & Demo

**Target Window:** Sep 7 – Sep 11, 2026  
**Internal Submission Target (T-5):** Sep 6, 2026  
**Hard Submission Deadline:** Sep 11, 2026, 23:59 UTC  
**Status:** **UPCOMING ⏳**  
**Milestone Goal:** Production hosting deployment, 60-second onboarding audit, demo video, final documentation, and competition submission.

---

## 1. Objectives & Task Breakdown

### Task 4.1 — Production Hosting & Deployment
- [ ] Deploy `@snake/server` on Railway/Fly.io with a persistent volume mounted at `/data` for the SQLite database.
- [ ] Deploy `@snake/client` on Cloudflare Pages / Netlify with custom domain and SSL.
- [ ] Configure production CORS allowlist and environment variables (`SEED_SALT`, `ADMIN_TOKEN`, `REWARD_SIGNER_KEY`).
- [ ] Perform health check validation on `/health`.

### Task 4.2 — Onboarding & Performance Audit (<60s Rule)
- [ ] Measure time from first app open to match play (must be <60s).
- [ ] Optimize client initial bundle (gzip <400 kB).
- [ ] Ensure 60 FPS performance on mid-range mobile devices with <50 draw calls in Phaser.
- [ ] Validate high-contrast and accessibility (a11y hit targets ≥44px, keyboard fallbacks for desktop testing).

### Task 4.3 — Submission Assets & Documentation
- [ ] Write the official **250-word project description** detailing Nimiq Pay integration and skill reward rules.
- [ ] Record a high-quality **60–90 second demo video** showing:
  1. Opening inside Nimiq Pay.
  2. Silent wallet identity detection.
  3. Fast 60s PvP match vs a friend or bot.
  4. Today's Run + replay verification + on-chain settlement card with transaction hash.
- [ ] Clean up `README.md` with setup instructions, architecture diagram, and license badges.
- [ ] Verify MIT license compliance.

### Task 4.4 — Formal Submission & Judging Rubric Audit
- [ ] Perform 20-item self-scoring audit against the competition rubric (target: ≥90/105 points).
- [ ] Submit on the Nimiq Mini Apps Competition portal before internal deadline (Sep 6).
- [ ] Attend final Sip & Ship call (Sep 9).

---

## 2. Acceptance Criteria for Phase 4

- [ ] Live production URL fully responsive and operational inside Nimiq Pay.
- [ ] Complete submission form submitted on time with repository link, description, and demo video.
- [ ] Replay verification running with 100% agreement and zero disputed payouts.
