# Competitive Snake UI Design Direction

Status: design reference and implementation brief
Scope: lobby, loading and connection states, match HUD, result states
Reference inputs: three Dribbble screenshots supplied by the product team

## 1. Reference Boundary

The supplied screenshots are visual references only. Do not extract, trace, or
reuse the designer's characters, icons, illustrations, logos, layouts, or exact
artwork unless the team has a separate license or written permission.

Use the references to guide composition, color relationships, hierarchy, and
motion. Create original Competitive Snake assets with the existing Lawn League
identity: expressive snakes, lawn textures, apples or stars, and Nimiq-safe
competition language.

Do not add the source screenshots or unlicensed image assets to the repository.
If a licensed asset pack is used, record its license and provenance in
`packages/client/src/assets/ATTRIBUTION.md`.

## 2. Product Register

Competitive Snake is a quick arcade sport inside Nimiq Pay. The player should
understand the next action immediately and enter a match with minimal setup.

Priority order:

1. Playability
2. Competitive state
3. Connection clarity
4. Verification
5. Rewards

Wallet identity must remain quiet in the lobby and must never make the product
look like a trading or betting interface.

## 3. Visual Direction

### Desired qualities

- Friendly, energetic, trustworthy
- Childlike color confidence with product-level restraint
- Soft surfaces with crisp, high-contrast type
- Chunky score numerals and short labels
- Original snake mascot used as the recurring visual anchor
- Celebratory result moments without confetti obscuring information

### Avoid

- Copying the reference designer's animal characters or icon silhouettes
- Generic SaaS cards or dashboard grids
- Neon crypto styling, holographic panels, or speculative-finance language
- Permanent decorative motion during active play
- Large illustrations over the arena
- Color-only player identification

### Palette roles

Use the existing Fresh Rink tokens where possible:

| Role | Existing token | Use |
|---|---|---|
| Product surface | `cream` | Lobby and result backgrounds |
| Deep surround | `ink-deep` | Match surround and focused overlays |
| Player accent | `coral` | Local player and primary action |
| Rival/player accent | `teal` | Secondary player and positive state |
| Pickup/reward | `lemon` or `gold` | Bounty, reward, lead indicator |
| Gameplay field | `grass` | Arena and field preview |
| Text | `ink` | Primary information |
| Secondary text | `muted` | Supporting labels only |

Inactive states should use tints or neutral ink, not four fully saturated
colors at once. Every player also needs a seat label, rank, or icon cue so color
is never the sole identifier.

## 3A. Typography Direction

Use a two-layer type system so the game has a distinct arcade voice without
sacrificing readability inside the Nimiq Pay WebView.

### Utility and body type

Use the existing rounded sans family, `Nunito`, for:

- lobby copy and instructions
- room codes and connection messages
- loading and error states
- player labels and status text
- buttons, settings, and verification language

This is the functional layer. It should remain easy to scan at small sizes and
should not use novelty or all-caps styling for sentences.

### Pixel display type

Use `Pixelify Sans` as the display layer. It should appear on approximately 15
to 25 percent of visible text, only where the game benefits from a stronger
arcade signal:

- `COMPETITIVE SNAKE` wordmark, if the final logo treatment supports it
- score numerals
- countdown numerals
- placement and rank values
- short game-state labels such as `YOU`, `OUT`, `READY`, and `1ST`

Do not use `Pixelify Sans` for paragraphs, long instructions, wallet copy,
connection explanations, or error details. Do not use `Press Start 2P`,
`Silkscreen`, `Tiny5`, or `VT323` as the general application font; their low
resolution forms become difficult to read at mobile UI sizes and make the
product feel like a generic retro-game template.

### Type hierarchy examples

```text
Competitive Snake       Nunito or Pixelify Sans wordmark treatment
YOU WIN                 Pixelify Sans
12,840                  Pixelify Sans
Connecting to the match Nunito
P3 · 8,420              Nunito with tabular numerals
Score verified          Nunito
```

Keep letter spacing at the browser default. Use weight, size, and contrast to
create hierarchy rather than tight tracking. Pixel display text must still fit
inside its container at the smallest supported viewport; shorten labels before
allowing overflow.

### Loading and HUD rule

Pixelify Sans can identify a state or number, but it must never be the only cue.
Pair `OUT`, `READY`, and connection states with an icon, rank, or shape cue so
the interface remains understandable without relying on the typeface or color.

## 4. Lobby

### Primary question

Can I play now?

### Composition

Use a single playable stage rather than a collection of nested cards:

```text
small wordmark / quiet wallet state

original snake mascot in the lawn scene
COMPETITIVE SNAKE
Grow. Boost. Outplay.

[ PLAY ]

[ PLAY WITH A FRIEND ]   [ TODAY'S RUN ]

quiet streak or verified-score summary
```

The `PLAY` action is the only dominant action. Room code and Today's Run are
secondary paths. Wallet connection can appear as a small connected identity
chip and must not block free play.

### Reference-derived details to keep

- Large, friendly illustration area
- Bright surface against a darker or saturated surround
- One large action with clear contrast
- Small supporting controls grouped below the primary action
- Rounded geometry with controlled radii, not inflated pill-shaped panels

### Original asset brief

Create an original snake mascot with a readable head, eyes, tongue, and two or
three body poses: idle, excited, and defeated. The mascot should work at both
hero size and 24px loading size. The mascot is a product asset, not a gameplay
source of truth.

## 5. Loading and Connection States

Loading screens must explain what the system is doing. A generic spinner alone
is not sufficient.

### State A: App boot

Copy: `Preparing the rink`

Visual: centered original snake mark, quiet grass or mint field, one short
progress treatment. No wallet prompt.

Exit condition: shell and local assets are ready.

### State B: Joining a room

Copy: `Connecting to the match`

Visual: small field preview with a connecting line or pulsing gate. Include the
room code when available. The retry action should not appear until a real error
occurs.

### State C: Waiting in lobby

Copy: `Waiting for players`

Visual: four fixed player slots, each with an original color marker, seat label,
and ready/empty state. Show `1 of 2 minimum` through `4 of 4` as appropriate.
Do not imply that an empty slot is a spectator seat.

### State D: Countdown

Copy: `Match starts in 3`, then `2`, then `1`

Visual: large centered numeral, compact four-player roster, and a visible room
connection indicator. The arena remains visible behind the countdown.

### State E: Reconnecting

Copy: `Reconnecting`

Supporting copy: `Your place is reserved for 8 seconds.`

Visual: pause the authoritative field view, soften the field contrast, show a
small countdown, and keep the player's score visible. Do not reset the match or
replace the player with a spectator.

### State F: Match complete, result loading

Copy: `Checking the final score`

Visual: result layout skeleton for placement, score, and player rows. Reveal the
verified state only after the server result arrives.

### State G: Connection failure

Copy: `Connection lost`

Supporting copy: `The match could not continue.`

Actions: `Try again` and `Return to lobby`.

Use an error icon and text in addition to color. Avoid blaming the player or
showing technical socket terminology.

### Loading motion rules

- Most transitions: 150 to 250ms.
- Countdown numeral: 240 to 360ms scale and fade.
- Reconnecting indicator: restrained pulse, not an infinite full-screen spin.
- Respect `prefers-reduced-motion` with static states or a simple opacity change.
- Never hide the entire interface while waiting for a small state update.

## 6. Match HUD

### Current limitation

The authoritative room already sends all snakes. The current client view model
reduces them to `you` and one `rival`, so players three and four cannot appear in
the score UI. This is a client presentation issue, not a server capacity issue.

Relevant implementation: `packages/client/src/game/MatchView.tsx`.

### Required data model

```ts
interface HudPlayer {
  seat: number;
  score: number;
  alive: boolean;
  color: string;
  isYou: boolean;
}

interface HudState {
  players: HudPlayer[];
  alive: number;
  boundary: number;
  seed: number;
  boosting: boolean;
  tick: number;
}
```

Derive `players` from every entry in `state.snakes`, sorted by seat. Do not use
`find()` to select a single rival.

### Four-player layout

Landscape layout:

```text
[P1 score] [P2 score]          match clock          [P3 score] [P4 score]

                         square lawn arena
```

Use four compact score entries, not four large cards. Each entry contains:

- seat or short player label (`YOU`, `P2`, `P3`, `P4`)
- score as the largest element
- small color marker plus a non-color cue
- `OUT` state when dead
- optional rank number when sorted by score

Keep the local player visually strongest with an outline, `YOU` label, or icon.
Do not reorder the physical position of a player every tick; rank can change
inside the entry without making the HUD jump.

Portrait fallback:

- Use a compact two-by-two score grid above the square field.
- Keep the arena unobstructed.
- If space is constrained, reduce label detail before reducing score legibility.

### Match-center information

The center status area contains only:

- match clock
- alive count
- shrink countdown or `Final size`
- connection status only when relevant

Do not place reward or wallet details over the active playfield.

### Dead-player state

Dead players remain in the list because they can spectate the survivors. Their
row should retain the final score and show `OUT`, using reduced emphasis rather
than disappearing.

## 7. Result Screen

Follow this hierarchy:

```text
placement / outcome
score
short performance stats
player standings
verified state
reward information, if applicable
rematch and share actions
```

For four players, show the complete final standings in a compact ordered list.
The local player row is highlighted. The result hero should be celebratory, but
the standings must remain readable within one viewport.

## 8. Component Inventory

Create reusable components instead of separate one-off layouts:

- `LobbyHero`
- `PrimaryPlayAction`
- `RoomCodePanel`
- `LoadingState`
- `ConnectionStatus`
- `PlayerRoster`
- `MatchScoreboard`
- `MatchStatus`
- `ResultStandings`
- `VerificationBadge`

Each stateful component needs default, loading, success, error, focus, and
reduced-motion behavior where relevant.

## 9. Typography and Spacing

Use the existing rounded sans family and a fixed product scale. Scores and
countdowns may use heavier weights, but labels must remain compact and readable.

Spacing rhythm: `4 / 8 / 12 / 16 / 24 / 32 / 48`.

Radius rhythm: `8 / 12 / 16 / 24`.

Minimum interactive target: 44px.

Do not use all-caps for sentences. Reserve short uppercase labels for states
such as `YOU`, `OUT`, `READY`, and `PRIVATE MATCH`.

## 10. Performance and Accessibility

- Preserve the Phaser render-only boundary.
- Keep React overlays absolutely positioned over the arena.
- Avoid full-screen blur and unbounded particles in loading/result states.
- Maintain strong contrast in mint and cream surfaces.
- Pair color with text, icons, rank, or shape cues.
- Keep keyboard support in desktop browsers.
- Test portrait WebView rotation, safe areas, and small landscape widths.
- Test four-player rosters with long scores and dead-player states.

## 11. Implementation Acceptance Criteria

- Lobby has one dominant `PLAY` action.
- Every loading state identifies the current operation.
- Connecting, waiting, countdown, reconnecting, and failure states are distinct.
- Four player scores are visible simultaneously during a match.
- Dead players remain visible as spectators with final scores.
- Local player identity is clear without relying on color alone.
- Result standings include all connected players.
- No Dribbble artwork is copied or committed without a license.
- Existing server and sim contracts remain unchanged by the HUD redesign.
