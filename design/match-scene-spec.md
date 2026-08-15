# Phaser Match Scene — Implementation Spec (Lawn League)

**Design:** Concept A · Lawn League (D24) · **Status:** approved, ready to build in W1
**Related:** spike `spike/index.html` (rotation math, input remap, deterministic sim) · wireframes `design/wireframes.html` · concepts `design/concepts.html`

---

## 1. Architecture principle (non-negotiable)

**Render-only Phaser.** Phaser reads sim state every tick and draws it; it never writes back to the sim. The pure deterministic module (`shared/sim`, spike-proven) is the single source of truth for both client and server replay verification. All animation is keyed to *tick index*; the only wall-clock value allowed is the interpolation alpha (render-only).

---

## 2. Scene & shell layout

- **Phaser config:** `Scene: MatchScene`, canvas 1280×720 logical, `resolution` scaled by `devicePixelRatio` for crisp text/edges, `pixelArt: false`.
- **DOM shell (React, outside Phaser):** the portrait-rotated container + absolutely-overlaid HUD/controls (spike rule D11). Phaser canvas = full 16:9 game area; HUD pills, d-pad, BOOST, hint pill are DOM.
- **Input:** d-pad + swipe → game direction via rotation-compensated mapping (reuse spike `screenToCell` / `swipeToDir`); BOOST = pointerdown/up → boost flag. All inputs append to the per-tick **input log** (the verification payload).

## 3. Scene layer order (bottom → top)

| Layer | Content | Notes |
|---|---|---|
| 0 | Grass background | TileSprite of `grass_tile` + seeded decorative sprites (daisies) |
| 1 | Boundary line | Dashed rounded rect, white, "painted" look; tweens as it shrinks |
| 2 | Pellets | Apple + golden star sprites, idle bob tween |
| 3 | Snakes | Segment sprites stamped per cell + head sprite; y-sorted |
| 4 | Particles | Boost trails, eat sparkles, death poof, win confetti (pooled) |
| 5 | Vignette | Full-canvas radial-gradient texture, subtle |

## 4. Snakes — the star (per D23)

- **Body:** pre-rendered segment textures (rounded square, glossy top-left highlight, darker outline, pattern dots) — `snake_segment_teal`, `snake_segment_coral` (40×40). One sprite per cell, rotated to the segment's travel direction; stamped at interpolated positions.
- **Head:** dedicated head textures (56×56) with big friendly eyes, white highlights, tongue, blush. Rotated to heading; squash-and-stretch tween on turn (scaleX/scaleY bounce), subtle.
- **Interpolation:** keep `prevCells` + `currCells` per snake; each frame position = `lerp(prev, curr, alpha)`, `alpha = clamp((now - lastTickTime)/TICK_MS, 0, 1)`. Target: buttery glide at 60fps on a 110ms tick — no cell snapping.
- **Boost:** lean/stretch scale + particle trail (pooled emitter, ~40 sprites max per snake); tail burns per sim (length comes from sim, render just draws fewer segments).
- **Death:** head/body fade + soft poof particles; no screen-shake (Fresh Rink calm).
- **Eat:** small sparkle burst at pellet location; score popup optional (HUD instead).

## 5. Pellets

- Apple (red + leaf + highlight) — normal, +1.
- Golden star — bounty, +3; slightly larger, gentle rotation tween, spawn sparkle.
- Idle bob (sin wave, phase from seed) — render-only.

## 6. Board dressing

- Grass: seamless mowed-lawn tile (256², two-tone mow stripes) as TileSprite across the full canvas; the *play* boundary (dashed line) sits inside with margin, so shrinking reads as the field narrowing.
- Daisies/dandelions: decorative sprites placed from the **match seed RNG** (stable per seed, render-only, never on the play grid or in sim).
- Confetti: on match win only, short-lived, pooled.

## 7. Vignette & light

- Soft radial vignette texture overlay (pre-baked, no runtime blur — WebView cost).
- No dynamic shadows; depth via outline + gloss baked into segment textures.

## 8. HUD & controls (DOM overlay)

- Pills: YOU (teal) · shrink timer (dark) · RIVAL (coral) · alive count. Updated on tick events (not every frame).
- D-pad (4 buttons) + BOOST (large, right thumb) + swipe zone = canvas.
- First-run hint pill "hold BOOST to speed up!" — fades after first boost use or ~8s.
- **Reduce-motion (a11y):** disable particles/bob/confetti; keep interpolation (or snap if requested); respect `prefers-reduced-motion`.

## 9. Match lifecycle

`lobby → countdown (3·2·1, ~2s) → playing → finished → settlement (React screen; Phaser fades/pauses)`
- Input log captured per tick from countdown start (turn + boost).
- On finish: log + seed + final state → POST to server for verification (Today's Run) or PvP result.
- State machine in a small controller; Phaser scene is a dumb renderer.

## 10. Performance budget (Nimiq Pay WebView, mid-range phone)

- **Target 60fps.** Draw calls < 50; particles pooled with hard caps (trails ≤200 total, poofs ≤24); one texture atlas.
- No runtime filters/blur/shadows; gloss/vignette pre-baked.
- Reuse spike's integer sim — no per-frame allocation in the render hot path (object pools for segment sprites; reuse sprite objects as sim length changes).
- Code-split the scene; target initial bundle < 400 kB gzip.

## 11. Asset list (one atlas: `match-assets`)

| Asset | Size | Notes |
|---|---|---|
| `grass_tile` | 256² | seamless, mow stripes, two-tone |
| `flower_daisy`, `flower_dandelion` | 32² | decorative, seeded placement |
| `snake_segment_teal/coral` | 40² | rounded + outline + gloss + dots |
| `snake_head_teal/coral` | 56² | eyes, tongue, blush; happy/neutral variants |
| `pellet_apple`, `pellet_star` | 40² | apple w/ leaf+highlight; star w/ shine |
| `sparkle`, `puff`, `trail_teal/coral`, `confetti` | 16² | pooled particles |
| `vignette` | full canvas | pre-baked radial |

## 12. Acceptance criteria

- M1: Board + boundary + pellets render; snakes **interpolate smoothly** at 60fps on a 110ms tick (no snapping).
- M2: D-pad / swipe / BOOST drive the sim through the rotation-compensated mapping (reuse spike round-trip test; 6/6 passes).
- M3: Effects within budget; reduce-motion respected; no jank on mid-range WebView.
- M4: **Render-only determinism** — sim output identical with rendering on/off (render must not read back into sim).
- M5: Shrink boundary animates with the sim; boundary, pellets, alive states always match sim state.
