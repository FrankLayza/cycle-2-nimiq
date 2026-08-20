# COMPETITIVE SNAKE — UI/UX AGENT SPECIFICATION

## 0. Purpose

This document is the implementation-facing UI/UX source for the Competitive Snake game. It is intended to be read by a design/code agent before generating or changing any UI.

Use this alongside the project's product and architecture documents. Do not invent features that are not approved in those documents.

**Primary goal:** create a polished mobile arcade experience that feels like a real game first, while making competition, verification, and NIM rewards understandable without turning the product into a crypto dashboard.

---

# 1. PRODUCT CONTEXT

## Product

Competitive Snake — Nimiq Mini App.

## Core proposition

A fast, skill-based multiplayer snake battle designed around rapid 60–90 second sessions. Nimiq Pay provides wallet identity, verified competition, and NIM rewards; the player does not deposit money.

## Core loop

```text
Open app
  ↓
Tap PLAY
  ↓
Instant free match
  ↓
Play 60–90 seconds
  ↓
Result
  ↓
Rematch / Share / Today's Run
```

## Main modes

### Instant bot match
- Default free-play mode.
- Bot fills an empty slot after approximately 5 seconds.
- Never rewarded.
- Bot must be clearly labeled.

### Room-code PvP
- Friend-focused 1v1 using a 4-character room code.
- Private matches are not eligible for the public rewarded leaderboard.

### Today's Run
- Solo daily seeded challenge.
- Same arena/conditions for everyone.
- Best verified run of the day per wallet counts.
- Rewarded.
- Server replay verification + signed attestation.

### Testnet stakes
- Stretch/demo functionality only.
- Clearly labeled TESTNET everywhere.
- Never visually imply that real user money is at risk.

## Important MVP scope

Design the actual MVP around **1v1**. Do not design a 4-player HUD or complex multiplayer interface unless explicitly asked. The current architecture uses 2 seats plus spectator support, while 4-player is deferred.

---

# 2. PRODUCT POSITIONING

The experience must feel like:

> **A polished mobile arcade sport that happens to have Nimiq-powered verified competition.**

It must NOT feel like:

> A crypto application containing a Snake game.

### Priority order

```text
GAMEPLAY
  ↓
COMPETITION
  ↓
TRUST / VERIFICATION
  ↓
REWARDS
  ↓
BLOCKCHAIN PROOF
```

Wallet identity and reward mechanics should be progressively revealed rather than dominating the first impression.

---

# 3. BRAND DIRECTION — FRESH RINK / LAWN LEAGUE

## Approved direction

**Fresh Rink → Lawn League**

## Personality

- Friendly
- Energetic
- Trustworthy
- Playful
- Competitive
- Approachable
- Premium through restraint, not visual noise

## Visual metaphor

Think of the game as a tiny competitive sport played on a sunny, manicured lawn.

The lawn, snakes, pellets, boundary, scoreboard, streaks and leaderboard should feel like one coherent visual world.

## Approved visual ingredients

- Warm off-white product background
- Green grass gameplay arena
- Coral player snake
- Teal rival snake
- Lemon/golden pellets and bounty objects
- Deep-ink text
- Rounded friendly typography
- Expressive 2D cartoon snake characters
- Daisies / subtle lawn detail
- Apples and/or golden stars as pickup language
- Springy, bouncy motion
- Confetti on victory
- No screen shake

## Anti-references — DO NOT USE

- Neon crypto styling
- Dark speculative-finance aesthetics
- Generic admin/dashboard layouts
- Placeholder geometric snake art
- Glassmorphism everywhere
- Holographic/sci-fi panels
- Excessive glow
- Glowing borders on every control
- Decorative gradients with no function
- Excessive particle effects
- Constant screen animation
- UI that looks like a casino/betting product
- Wallet UI as the hero
- Blockchain jargon as primary player-facing copy

---

# 4. NORTH-STAR UI PRINCIPLES

## Rule 1 — Gameplay always wins over UI

The arena is the dominant visual object during a match.

## Rule 2 — One dominant question per screen

Every screen should make the player's current task obvious.

| Screen | Primary question |
|---|---|
| Lobby | Can I play? |
| Room | How do I join my friend? |
| Today's Run | Can I beat today's score? |
| Match | What should I do right now? |
| Death | Why did I lose? |
| Result | How did I perform? |
| Leaderboard | Where do I stand? |
| Reward | What did I earn and why? |
| Share | Can I show people? |
| Settings | Can I control the experience? |

## Rule 3 — One primary action per screen

Do not create competing primary CTAs.

## Rule 4 — Contextual UI beats permanent UI

Only show information when it helps the player make a decision or understand a state.

## Rule 5 — Let the game world communicate game information

If the arena can communicate a mechanic visually, prefer that over adding another permanent HUD element.

Examples:
- Shrink boundary communicates WHERE danger will move.
- Shrink timer communicates WHEN.
- Snake reaction communicates impact.
- Pickup animation communicates collection.

## Rule 6 — Trust must be legible without becoming technical

Prefer:
- `✓ Score verified`
- `✓ Reward settled`
- `View transaction`

Avoid primary UI text such as:
- `ATTESTATION VERIFIED`
- `SIM_VERSION 1.3`
- raw replay hashes
- raw blockchain hashes as hero content

## Rule 7 — Empty space is intentional

Never add UI just because an area feels empty.

## Rule 8 — Polish is not visual density

Premium quality comes from:
- hierarchy
- spacing
- consistency
- responsiveness
- feedback
- motion
- art direction
- restraint

---

# 5. UX ARCHITECTURE

```text
APP
│
├── SPLASH
│
├── LOBBY
│   ├── Play
│   ├── Room Code
│   ├── Today's Run
│   ├── Streak
│   └── Quiet Wallet Identity
│
├── ROOM
│   ├── Code
│   ├── Copy
│   ├── Join
│   └── Private Match State
│
├── MATCH
│   ├── Gameplay World
│   ├── Match HUD
│   ├── Swipe
│   ├── D-Pad
│   ├── Boost
│   ├── Event Feedback
│   └── Connection
│
├── RESULT
│   ├── Win/Loss
│   ├── Stats
│   ├── Verification
│   ├── Reward
│   ├── Transaction
│   ├── Rematch
│   └── Share
│
├── TODAY'S RUN
│   ├── Daily Challenge
│   ├── Play
│   ├── Your Rank
│   ├── Leaderboard
│   └── Rewards
│
├── SHARE
│   └── Generated Result Card
│
└── SETTINGS
    ├── Controls
    ├── Sound
    ├── Haptics
    ├── Reduced Motion
    └── Accessibility
```

Keep navigation shallow. Do not introduce unnecessary tabs, nested navigation stacks, or feature hubs in the MVP.

---

# 6. INFORMATION ARCHITECTURE

The product has five experience layers:

1. **Play** — can the user enter immediately?
2. **Game** — can the player understand and control the match?
3. **Competition** — can the player understand performance/rank?
4. **Trust** — can the player verify that the result is legitimate?
5. **Reward** — did skill result in NIM, and why?

The first-time user should mainly experience layers 1–2. Returning competitors gradually encounter layers 3–5.

---

# 7. LOBBY SPEC

## Goal

Make the game feel immediately playable and friendly.

## Recommended hierarchy

```text
Snake character / hero

COMPETITIVE SNAKE

Short tagline

[ PLAY ]

[ ROOM CODE ]   [ TODAY'S RUN ]

Streak

Quiet wallet identity
```

## Rules

- `PLAY` must dominate.
- Hero should sell the game fantasy, not the blockchain.
- Wallet identity should remain quiet.
- Do not show a large NIM balance as a primary element.
- Do not show transaction history.
- Do not show a dense reward dashboard.
- Do not put a giant leaderboard preview above PLAY.

## Suggested microcopy

- `Be the last snake standing.`
- `Grow. Boost. Outplay.`
- `Ready?`

Use short, human, friendly copy.

---

# 8. FIRST-RUN / ONBOARDING SPEC

## Goal

Get the user into a playable match as fast as possible.

## Required flow

```text
Splash
  ↓
Tap PLAY
  ↓
Silent wallet identity init
  ↓
Instant bot match
  ↓
Lightweight in-match hint
  ↓
Play
  ↓
Result
  ↓
Rematch
```

## DO NOT

- Do not create a tutorial carousel.
- Do not require profile setup.
- Do not require wallet education before the first match.
- Do not require reward configuration.
- Do not explain every game rule before gameplay.

## Hints

First-turn hint:
`SWIPE TO TURN`

Boost hint:
`HOLD BOOST`

Shrink hint:
`THE FIELD IS CLOSING`

Only teach mechanics that are unique to Competitive Snake.

---

# 9. ROOM-CODE FLOW

## Room creation

```text
PLAY WITH A FRIEND

YOUR ROOM

7X9K

[ COPY CODE ]

Waiting for friend…
```

## Join

```text
PLAY WITH A FRIEND

[ 7 ][ X ][ 9 ][ K ]

[ JOIN ]
```

## Trust clarity

Show:
`PRIVATE MATCH`

Then clearly communicate:
`Private matches don't affect Today's Run leaderboard.`

Do not bury that distinction.

---

# 10. MATCH SCREEN — PRIMARY UI SPEC

## Layout

The gameplay view is a **portrait device containing a rotated 16:9 landscape game canvas**.

Use the approved architecture:
- 16:9 game canvas
- CSS-rotated landscape viewport inside the portrait-locked Nimiq Pay container
- React DOM overlay for HUD/controls
- Phaser for gameplay rendering
- HUD/controls absolutely overlaid on the canvas
- Never use in-flow HUD that changes canvas dimensions or input mapping

## High-level layout

```text
┌────────────────────────────────────┐
│ SCORE      TIME             STATE  │
│                                    │
│                                    │
│            LAWN ARENA              │
│                                    │
│                                    │
│                                    │
│ D-PAD                        BOOST │
└────────────────────────────────────┘
```

## Top information

Show only essential state:
- Player score
- Rival score when useful
- Match time/state
- Shrink countdown
- Connection state only when relevant

## Center

Gameplay dominates.

Avoid large UI cards over the play area.

## Bottom-left

D-pad fallback + swipe area.

## Bottom-right

Boost control.

## Critical rule

Controls must remain in peripheral safe zones and should never visually obscure important snake/action information.

---

# 11. MATCH HUD DETAILS

## Score

Visual priority:
- number > label

Example:
```text
YOU
1,284
```

Avoid verbose labels.

## Rival score

For 1v1, show a visually weaker counterpart.

Example:
```text
YOU  1,284     RIVAL 1,112
```

Do not make both equally dominant.

## Time

Use compact numeric representation.

Example:
`0:47`

Do not write full sentences.

## Shrink

Example:
`SHRINK 04`

The world boundary should reinforce this state visually.

## Connection

Normally hidden.

Only show when meaningful:
- `Connection slow`
- `Reconnecting…`
- `Connection lost`

Never interrupt gameplay for tiny network fluctuations.

---

# 12. GAMEPLAY CONTROLS

## Primary control

Swipe anywhere in the appropriate gameplay region.

## Fallback

D-pad.

## Desktop

Keyboard support.

## Interaction requirements

- Minimum 44px touch targets.
- Prefer larger targets for important actions.
- Allow forgiving touch tolerance.
- Do not require precision tapping.
- Block immediate illegal 180-degree reversal according to game rules.
- Preserve input buffering behavior defined by the simulation.

## D-pad appearance

- Soft circular/rounded directional control.
- Subtle while idle.
- Strong pressed state.
- Large invisible hit areas.
- Must not resemble four generic website buttons.

---

# 13. BOOST CONTROL

Boost is a gameplay mechanic, not just a button.

The player needs to understand:
1. It increases speed.
2. It has a cost.
3. It has an availability state.

## States

### Ready
`BOOST`

### Active
`BOOSTING`

Show clear but lightweight state feedback.

### Empty/unavailable
Dimmed state.

### Recovered
Short reactivation feedback.

Avoid constant pulsing or glowing.

---

# 14. GAME-WORLD FEEDBACK SYSTEM

The world should communicate events before HUD does wherever practical.

## Eating normal pellet

- Small squash/pop.
- `+1` feedback.
- Short audio cue.
- No large overlay.

## Bounty pickup

- Distinct golden/luminous object.
- Stronger pickup animation.
- `+3` feedback.
- Communicate boost benefit.

## Boost

- Snake stretches/leans forward.
- Subtle trail.
- No screen shake.

## Collision

- Short impact response.
- Immediately explain winner/loser outcome if necessary.

## Kill

- Brief `OUT!` / `ELIMINATED` treatment.
- `+1 KILL` if appropriate.
- Keep it contextual and short.

## Shrink

- Boundary becomes increasingly prominent.
- Timer provides anticipation.
- Boundary smoothly contracts.

## Victory

- Character celebration.
- Controlled confetti.
- Strong result reveal.

---

# 15. DEATH / LOSS UX

## Requirement

The player must understand **why** they died.

## Avoid

`GAME OVER`

with no explanation.

## Better

```text
OUT

You hit the wall.
```

or:

```text
OUT

You hit the rival's body.
```

or:

```text
OUT

You lost the head-on.
```

Then transition into result.

Use a short impact/pause before presenting the final state.

---

# 16. VICTORY UX

Recommended hierarchy:

```text
1ST

YOU WIN

12,840 SCORE

stats

✓ SCORE VERIFIED

+30 NIM

[ PLAY AGAIN ]
```

The emotional result must appear before technical settlement information.

---

# 17. SETTLEMENT / RESULT CARD

## Information hierarchy

```text
RESULT
  ↓
PERFORMANCE
  ↓
VERIFICATION
  ↓
REWARD
  ↓
BLOCKCHAIN PROOF
  ↓
NEXT ACTION
```

## Example

```text
1ST
YOU WIN

12,840
SCORE

01:04 SURVIVED
3 BOOSTS
4 BOUNTIES

✓ SCORE VERIFIED

+30 NIM

View transaction

[ PLAY AGAIN ]

Share   Lobby
```

## Transaction hash

Never make the raw hash the hero.

Use:
`View transaction`

Then reveal the hash/detail secondary.

---

# 18. VERIFICATION LANGUAGE

Use a consistent vocabulary.

### Score verified
`✓ Score verified`

### Reward settled
`✓ Reward settled`

### On-chain proof
`View transaction`

### Testnet
`TESTNET`

### Private room
`PRIVATE MATCH`

Never use misleading or overly technical terminology in primary UI.

---

# 19. TODAY'S RUN — FLAGSHIP COMPETITION MODE

## Positioning

Today's Run is the main competitive/rewarded UX surface.

## Core message

> **Same field. Same conditions. Pure skill.**

## Suggested layout

```text
TODAY'S RUN

AUG 19

Same field.
Same conditions.
Pure skill.

[ PLAY ]

YOUR RANK
#17
12,840

TODAY'S LEADERS

1  Mia       18,420
2  Kelechi   17,930
3  Tobi      17,410

REWARDS
1st  30 NIM
2nd  20 NIM
3rd  10 NIM
```

## Rules

- Make fairness obvious.
- Make `PLAY` dominant.
- Make the user's rank easy to find.
- Keep leaderboard visually simple.
- Reward amounts should be contextual, not the entire screen.
- Public competition should feel like a sport/league, not a financial market.

---

# 20. LEADERBOARD

Use a simple table/list rhythm.

Recommended row information:
- Rank
- Player name/handle
- Score
- Reward when relevant

Highlight the current user.

Do not add excessive badges, wallet details, transaction hashes, or decorative medals to every row.

---

# 21. STREAK

The streak is a retention system.

Make it playful.

Example:

```text
6 DAY STREAK
● ● ● ● ● ● ○

Come back tomorrow.
```

Do not make streak UI look like financial accounting.

Consider Lawn League-inspired metaphors such as small flags, footprints, or league marks.

---

# 22. SHARE CARD

## Purpose

The share card is not merely decorative. It is:
- result UI
- social proof
- distribution
- product identity
- retention support

## Required content

- Rank
- Total competitors if available
- Score
- Verification state
- Streak
- Masked identity/handle
- Wordmark/brand

## Recommended hierarchy

```text
3RD
OF 17

12,840

SCORE

✓ VERIFIED

6 DAY STREAK

Snake artwork

COMPETITIVE SNAKE
```

The card should be understandable in under one second when seen outside the app.

---

# 23. WALLET UI

## Principle

Wallet = identity + reward destination + proof layer.

It is NOT the main attraction.

## Lobby

Use a quiet identity chip such as:
`✓ Connected`

or a small masked identity.

Do not make wallet balance the hero.

## Free play

Wallet connection should not block or interrupt the first match.

## Rewarded flow

Wallet matters when the product needs to explain the reward destination/settlement.

---

# 24. REWARD UX

Every reward UI must answer four questions:

### Why did I receive it?
Example:
`Daily leaderboard — 2nd place`

### How much?
`+20 NIM`

### Can I trust it?
`✓ Reward settled`

### Where did it go?
`View transaction`

Do not force users to understand blockchain mechanics to understand a reward.

---

# 25. TESTNET UX

Testnet functionality is a stretch/demo mode.

When present:

- Show `TESTNET` prominently.
- Make testnet status impossible to confuse with mainnet/real reward settlement.
- Never use copy that implies real money is at stake.
- Keep testnet explanations concise.

---

# 26. LOADING STATES

Avoid generic blank spinners whenever possible.

### Matchmaking
`Finding a rival…`

### Today's Run
`Preparing today's field…`

### Verification
`Checking your run…`

### Settlement
`Sending your reward…`

### Reconnect
`Reconnecting…`

Use the snake character and Lawn League visual language for larger loading states, but keep short waits visually light.

---

# 27. ERROR STATES

Errors must state:
1. what happened,
2. what it means,
3. what the user can do next.

Example:

```text
CONNECTION LOST

Trying to reconnect…

[ RETRY ]
```

Wallet/reward example:

```text
REWARD NOT SETTLED

Your match is safe. We'll retry the payout.

[ CLOSE ]
```

Avoid raw HTTP/server error language in the primary UI.

---

# 28. CONNECTION UX

Connection status hierarchy:

### Healthy
Nothing visible.

### Degraded
Small non-blocking indicator.

### Reconnecting
Visible message.

### Lost
Clear recovery state.

The UI should never look frozen when the network is unhealthy.

---

# 29. ACCESSIBILITY

Accessibility is a core design requirement, not an end-stage task.

Required:
- Strong contrast.
- Minimum 44px touch targets.
- Keyboard support on desktop.
- Non-color-only gameplay cues.
- Reduced-motion behavior.
- Clear pressed/focus states.
- Safe-area awareness.
- Usable text in rotated mobile viewport.

## Player differentiation

Do not rely only on coral vs teal.

Pair color with:
- snake head treatment
- pattern/marking
- silhouette/detail
- labels where needed

---

# 30. REDUCED MOTION

### Full-motion mode
- Snake squash/stretch.
- Pickup pops.
- Bounces.
- Controlled confetti.
- Smooth transitions.
- Boost trail.

### Reduced-motion mode
- Remove continuous decorative motion.
- Reduce scale/bounce intensity.
- Reduce particles/confetti.
- Avoid unnecessary auto-motion.
- Preserve essential feedback through simple state change and text/icon cues.

Do not use screen shake.

---

# 31. MOTION SYSTEM

Use a small controlled vocabulary:

- squash
- stretch
- pop
- slide
- fade
- scale
- spring
- settle

Approximate timing bands:

### Micro
50–120ms

### Standard
120–260ms

### Impact
250–450ms

### Victory
450–800ms

Do not make simple navigation slow.

Motion must communicate:
- cause
- state change
- reward
- attention
- feedback

Never animate purely because animation is possible.

---

# 32. SNAKE CHARACTER SYSTEM

The snake is a character, not a rectangle.

Use approved direction:
- expressive heads
- eyes
- tongue
- blush/face detail where appropriate
- rounded body segments
- squash on turns
- boost trail

The snake can be reused as a product mascot in:
- lobby hero
- splash
- loading
- countdown
- victory
- defeat
- empty states
- share cards

This creates one coherent identity system.

---

# 33. ART DIRECTION

## Gameplay world

- Green grass arena.
- Subtle mowed-lawn texture.
- Daisies.
- Seeded render-only decorative details.
- Rounded cartoon snakes.
- Apples/stars or approved pickup motifs.
- Painted dashed shrink line.
- Soft vignette.

## Rendering

- Phaser owns gameplay rendering.
- React owns surrounding application UI.
- Client renders sim state; Phaser does not become the source of truth.
- Preserve performance budget.

---

# 34. COMPONENT SYSTEM

Start with a small component set.

## Shell
- Page
- Header
- BottomActionBar

## Actions
- PrimaryButton
- SecondaryButton
- IconButton

## Status
- StatusPill
- VerificationBadge
- ConnectionStatus
- RewardBadge

## Gameplay
- MatchHUD
- ScoreDisplay
- ShrinkIndicator
- BoostControl
- DPad
- EventFeedback

## Results
- ResultHero
- StatsGrid
- SettlementCard
- TransactionRow

## Competition
- Leaderboard
- LeaderboardRow
- Streak

## Social
- ShareCard

## Overlays
- Hint
- Toast
- Confirmation

Do not create many near-duplicate components.

---

# 35. COMPONENT STATE RULES

Every interactive component should define when relevant:

- default
- hover
- pressed
- focus
- disabled
- loading
- success
- error

Do not rely on color alone to communicate these states.

Pressed state should feel tactile.

Focus state must be visually obvious for keyboard users.

---

# 36. DESIGN TOKENS

Use a controlled spacing rhythm:

`4 / 8 / 12 / 16 / 24 / 32 / 48`

Use a controlled radius scale:

`8 / 12 / 16 / 24`

Avoid arbitrary values unless they are required by the gameplay canvas or platform safe areas.

## Visual weight

- Primary: strongest contrast.
- Secondary: moderate.
- Tertiary: reduced.
- Decorative: lowest.

---

# 37. COLOR RULES

Use a disciplined product palette.

### Product
- Warm off-white
- Deep ink
- Controlled neutrals

### Game
- Grass green
- Coral player
- Teal rival
- Lemon/gold pickups

Do not make every UI element use game colors.

**Game-world color should be expressive. Product UI should be restrained.**

---

# 38. TYPOGRAPHY RULES

Use one rounded grotesque family with several weights.

Use chunky numerals for:
- score
- countdown
- placement
- rank
- rewards

Avoid:
- novelty gamer fonts
- ultra-thin text
- poor numeral styles
- long sentences for compact game state

---

# 39. MICROCOPY RULES

Copy should be:
- short
- human
- playful
- confident
- competitive
- trustworthy

Good examples:
- `Ready?`
- `Finding a rival…`
- `SWIPE TO TURN`
- `HOLD BOOST`
- `THE FIELD IS CLOSING`
- `OUT`
- `YOU WIN`
- `Score verified`
- `Reward settled`
- `View transaction`
- `Same field. Same conditions. Pure skill.`

Avoid:
- corporate fintech copy
- developer language
- crypto jargon
- long explanatory paragraphs in core gameplay
- manipulative reward language
- betting language

---

# 40. GAMEPLAY VS PRODUCT UI BOUNDARY

## Phaser owns

- gameplay canvas
- snakes
- pellets
- arena
- effects
- gameplay animations
- visual game state

## React DOM owns

- lobby
- room flow
- Today's Run
- leaderboard
- settlement
- share
- settings
- HUD/control overlays

Do not make React re-render the arena every frame.

Do not turn Phaser into the entire application shell.

---

# 41. RESPONSIVE / ROTATED VIEWPORT RULES

Design and test for:

- portrait mobile WebView
- rotated 16:9 gameplay
- safe areas/notches
- small phones
- large phones
- desktop/browser fallback

The player must never experience:
- clipped D-pad
- clipped Boost
- control behind safe-area content
- distorted game canvas
- horizontal page scrolling
- inaccessible controls
- overlay blocking the important play area

The browser spike proved rotation/input mapping, but real Nimiq Pay WebView behavior still requires device verification. Treat this as a hard implementation constraint.

---

# 42. PERFORMANCE-AWARE DESIGN

Project requirements:
- 60fps target on mid-range phones.
- Fewer than 50 draw calls.
- Initial bundle under 400 kB gzip.

Therefore avoid design concepts that require:
- heavy blur everywhere
- giant video textures
- excessive filters
- unbounded particles
- per-segment expensive effects
- unnecessary animation layers

The visual system must look polished within the actual runtime budget.

---

# 43. TRUST UX MODEL

Trust should be progressively disclosed.

## Casual player
`✓ Score verified`

## Curious competitor
`Verified replay`

## Judge / technical audience
- replay verification
- attestation
- transaction hash
- explorer link

Do not force technical userspace onto casual users.

---

# 44. REWARD / COMPETITION LANGUAGE MODEL

The product is:

```text
PLAY
→ PERFORM
→ VERIFY
→ EARN
```

Not:

```text
DEPOSIT
→ WAGER
→ WIN/LOSE
→ WITHDRAW
```

Never design UI that visually implies the second model.

The house does not hold player funds, and players do not lose deposited money in the approved MVP reward structure.

---

# 45. “UI SLOP” REJECTION CHECK

Before accepting any generated screen, ask:

### Does this element have a job?

### Why is it visible now?

### Why is it this large?

### Why is it here?

### Why is it this color?

### Why is it animated?

If the answer is unclear, remove it.

Also run:

## Blur test
Blur the screen. The primary focus and action should remain visually obvious.

## Five-second test
Show the screen briefly. The user should identify the intended task immediately.

## 20% removal test
Remove approximately 20% of UI and see whether comprehension improves.

## Gameplay test
During a match ask: “Could this element make the player worse at playing?” If yes, reconsider it.

---

# 46. AUDIT RUBRIC

Score the design out of 100.

| Category | Weight |
|---|---:|
| Gameplay hierarchy | 20 |
| Mobile ergonomics | 15 |
| Information hierarchy | 10 |
| Visual identity | 10 |
| Feedback | 10 |
| Trust clarity | 10 |
| Simplicity | 10 |
| Accessibility | 5 |
| Consistency | 5 |
| Technical realism | 5 |
| **Total** | **100** |

## Ship threshold

**90+**

Anything below 80 should not be treated as submission-ready.

---

# 47. HARD FAIL CONDITIONS

Reject the design if it contains any of these:

1. Gameplay is visually subordinate to UI.
2. Wallet/balance dominates the lobby.
3. Normal free play visually resembles betting.
4. Neon/dark crypto style appears.
5. Multiple competing primary CTAs.
6. Permanent tutorial text blocks gameplay.
7. Tiny controls.
8. Color is the only player identifier.
9. Transaction hash is hero content.
10. Fake dashboard/card clutter.
11. Excessive particles/glow/screen shake.
12. Rotated WebView layout is unusable.
13. Reward information is unclear or misleading.
14. Today's Run feels like a generic leaderboard rather than a flagship mode.
15. Technical complexity leaks into primary player-facing UI.
16. UI exists mainly to fill empty space.
17. Design invents an unapproved MVP feature.

---

# 48. FINAL AGENT DIRECTIVE

Design Competitive Snake as a **premium mobile arcade sport**, not a website with a game inside it and not a crypto dashboard with gameplay attached.

The visual direction is **Fresh Rink / Lawn League**: bright, friendly, trustworthy, sunny, playful and competitive.

The arena, snake characters, pickups and game-world feedback should carry most of the product's personality. The UI should stay restrained, highly legible and contextual.

The user should be able to open the app, tap PLAY and understand what to do almost immediately.

During gameplay, prioritize:
- seeing the snake,
- seeing the opponent,
- seeing the field,
- understanding score/status,
- controlling movement reliably,
- understanding Boost,
- understanding Shrink,
- understanding collision outcomes.

After gameplay, prioritize:
- emotional result,
- performance stats,
- verification,
- reward,
- transaction proof,
- rematch/share.

Today's Run should communicate fairness through the simple idea:

> **Same field. Same conditions. Pure skill.**

Every component must justify its existence.

Every screen gets one dominant question, one visual focal point and one primary action.

**Gameplay always wins over UI.**

---

# 49. SOURCE-OF-TRUTH ALIGNMENT

This UI spec is derived from the current project documents, especially:

- `COMPETITIVE_SNAKE_GAME.md`
- `prd.md`

Important approved constraints reflected here include:
- Fresh Rink / Lawn League visual direction.
- 1v1-first MVP.
- 60–90 second matches.
- Instant bot match.
- Room-code PvP.
- Today's Run.
- Server verification and attestation.
- NIM rewards from the project's own seeded pool.
- Testnet mode as a clearly labeled stretch/demo feature.
- Portrait Nimiq Pay container with rotated 16:9 gameplay.
- Absolute HUD/control overlays.
- 44px minimum touch target.
- Reduced motion.
- High contrast and non-color-only cues.
- React application shell + Phaser gameplay.
- 60fps / <50 draw calls / <400 kB initial gzip targets.

When a new design request conflicts with these constraints, follow the latest approved project decision rather than silently inventing a new direction.
