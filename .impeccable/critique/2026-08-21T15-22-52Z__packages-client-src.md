---
target: game design UI (packages/client/src)
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-08-21T15-22-52Z
slug: packages-client-src
---
# Critique — Competitive Snake client UI (`packages/client/src`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Full phase coverage (connecting/waiting/countdown/error/finished); no connection-quality cue once playing |
| 2 | Match System / Real World | 3 | Natural copy throughout; "Shrink 07" unexplained for first-timers |
| 3 | User Control and Freedom | 2 | No exit/pause during an active match — trapped until terminal state |
| 4 | Consistency and Standards | 2 | Two different d-pads, two boost buttons, two HUD treatments across MatchView vs TodayRunView |
| 5 | Error Prevention | 3 | Crockford-filtered code input, join disabled until 4 chars, wallet gating with clear message |
| 6 | Recognition Rather Than Recall | 3 | Contextual hints, deep-link room prefill, aria-labeled controls |
| 7 | Flexibility and Efficiency | 1 | Zero keyboard support despite PRODUCT.md requiring desktop keyboard play |
| 8 | Aesthetic and Minimalist Design | 3 | Focused, playful, committed Fresh Rink palette |
| 9 | Error Recovery | 2 | Plain-language errors with lobby exit, but the run/match is always lost; no retry |
| 10 | Help and Documentation | 1 | No how-to-play anywhere; boost cost and shrink mechanic never explained |
| **Total** | | **23/40** | **Acceptable — significant improvements needed before judges/users are happy** |

## Anti-Patterns Verdict

**LLM assessment**: Not slop. The Fresh Rink palette is genuinely committed (coral primary, teal secondary, lemon accent on cream), Nunito carries everything, and the tactile press physics give it real personality. Two tells remain: uppercase tracked eyebrows appear above nearly every section (Lawn League / Quick 1v1 battles / Match result / Daily challenge / Your best / Reward position), and the W/L/D letter-in-circle result emblem is generic.

**Deterministic scan**: 2 findings, both `bounce-easing` warnings at index.css:63 and :132 (`cubic-bezier(0.2, 0.9, 0.3, 1.2)` overshoot used by score-pop/status-pop/result-panel). Defensible as arcade personality, but status-pop and result-panel are state transitions, not game feedback — ease-out would serve them better.

## Overall Impression

A coherent, friendly arcade shell that clearly had real design attention: one primary action per screen, honest state communication, and a trust-building verified-score moment. The biggest gap is trust-by-placeholder: a rewards product showing hardcoded "0 day streak", "No score yet", and static 30/20/10 NIM tiers reads as unfinished to exactly the judges it must convince. Second gap: you can strand players mid-match with no way out.

## What's Working

1. **Committed brand system** — Fresh Rink palette + single-family Nunito + consistent coral primary CTA with press physics. It feels like one product, not stitched screens.
2. **State communication** — every async phase has a designed screen; waiting-for-opponent surfaces the room code so the host knows what to share.
3. **Accessibility fundamentals** — 44px+ touch targets, focus-visible outlines, aria-labels on all controls, safe-area insets, reduced-motion coverage.

## Priority Issues

1. **[P1] No exit or pause during an active match** — MatchView renders no exit affordance while `phase === 'playing'`; a player who must leave (or joined the wrong room) is trapped until their snake dies.
   *Fix*: add a small exit/pause control to the HUD row (pointer-events enabled, outside the canvas). *Suggested command*: `$impeccable harden`
2. **[P1] No keyboard controls** — input is pointer-only (swipe + d-pad). PRODUCT.md explicitly requires desktop keyboard support; judges will open this in a browser first.
   *Fix*: wire Arrow/WASD keys and Space (boost) into both MatchView and TodayRunView. *Suggested command*: `$impeccable audit` then implement
3. **[P1] Hardcoded placeholder data in trust-critical spots** — Lobby footer "0 day streak"; Today's Run "No score yet" plus static 30/20/10 NIM reward tiers regardless of actual `/rewards/schedule`. For a product whose whole pitch is verifiable rewards, fake numbers are the worst possible placeholder.
   *Fix*: fetch real streak/profile and reward schedule; hide rows until data exists rather than inventing zeros. *Suggested command*: `$impeccable harden`
4. **[P2] Text contrast failures** — `text-muted` (#7d8797) on cream (#f5f3ee) ≈ 3.3:1 for body-size copy (hero subtitle, footer); coral (#ff686b) small bold labels on white ≈ 2.9:1 ("Quick 1v1 battles"); white-on-coral primary button ≈ 2.9:1 (borderline even for large text).
   *Fix*: darken muted toward ink (~#5f6b7d), use coral-dark for small labels, verify button pairings ≥4.5:1. *Suggested command*: `$impeccable colorize`
5. **[P2] Divergent control vocabulary between game surfaces** — MatchView uses a 3×3 frosted-white d-pad + 96px square boost; TodayRunView uses a 2-row translucent-dark d-pad + 80×112px boost; HUDs differ (white frosted cards vs dark ink header).
   *Fix*: extract one shared Controls/HUD component. *Suggested command*: `$impeccable document` then `$impeccable polish`

## Persona Red Flags

**Casey (distracted mobile user)**: Thumb-zone layout is genuinely good (d-pad bottom-left, boost bottom-right). Red flag: an interruption mid-match has no recovery path — no pause, and returning may find the snake dead with no summary of what happened while away.

**Jordan (first-timer)**: No rules anywhere. "Shrink 07" appears with zero explanation of what shrinks or why it matters; boost says "tail burns" without saying it costs score/length. Will lose their first match to mechanics they never learned and blame the game.

**Sam (accessibility-dependent user)**: Keyboard-only users cannot play at all (heuristic 7). Muted-text contrast failures hit low-vision users hardest since they're used for descriptions and footers. Credit: focus outlines and aria-labels are done right.

## Minor Observations

- Eyebrow density: 6+ uppercase tracked labels across three screens; keep one or two, demote the rest to normal-weight text.
- Result emblem letters W/L/D add nothing over the headline directly beneath them; consider dropping or replacing with the snake character.
- `match-hint` fades to 45% opacity but stays forever; dismiss it after first successful turn instead.
- PvP rematch sets optimistic `countdown` phase locally before server confirms; if the rival leaves, the UI sits in countdown with no timeout.
- Share fallback silently copies to clipboard with no confirmation feedback.

## Questions to Consider

- What if the lobby footer showed live, personal data (streak, best rank) instead of placeholders — the cheapest possible trust win?
- What if losing explained why (wall vs rival vs self-bite)? The sim doesn't expose loss reasons yet — that's a versioned sim change worth scheduling deliberately.
- Does Today's Run need its own visual language, or should it feel like the same game wearing a different jersey?
