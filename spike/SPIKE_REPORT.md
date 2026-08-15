# Spike Report — Competitive Snake

**Project:** Competitive Snake (Nimiq Mini App)
**Date:** 2026-08-15
**Spike Author:** AI (Codebuff) + developer

---

## Unknown Targeted

1. Does a **CSS-rotated landscape viewport** work inside a portrait-locked mobile container, and does **input coordinate remapping** stay correct (the "mobile experience" + "core feature" scoring items)?
2. Is the **deterministic simulation + replay verification** model sound enough to build the anti-cheat / reward-trust layer on?
3. Do the **two-snake tick model** (head-on length/momentum rule, body collision) and bot opponent behave correctly?

---

## Time Budget

- Planned: 2–4 hours. Actual: ~1.5 hours (prototype built + verified in browser).

---

## What Was Built

A self-contained, zero-dependency prototype (`spike/index.html`, single file):
- 16:9 landscape game world rotated 90° via CSS in portrait media query (`@media (orientation: portrait) { transform: rotate(90deg) }`).
- 30×30 grid, no wraparound; shrink boundary every 100 ticks (≈11s).
- Normal pellets (+1) and bounty pellets (+3 length, +1 boost charge).
- Base tick 110ms; boost doubles speed, burns 1 tail segment per second.
- Collisions: head-on (longer survives; equal → "most recent turner" loses, never-turned tie → both die) and body (attacker dies, defender +3).
- **Deterministic simulation** (mulberry32 seeded RNG, integer math only) + **replay verification**: recorded input log is re-simulated server-style and must reproduce the match byte-identically.
- Bot opponent (greedy pellet-seeking AI with wall/body penalties, seeded tie-break).
- Input: swipe (rotation-compensated), on-screen d-pad, BOOST button; keyboard arrows for desktop.

---

## What Worked (verified in browser)

| Check | Result |
|---|---|
| Rotation: 16:9 world fills portrait viewport rotated 90° | ✅ |
| **Input remapping round-trip** (click where a cell *appears* → correct grid cell), all 4 corners + center | ✅ 6/6 |
| Swipe direction feels visually correct (screen-right = game-up in portrait) | ✅ |
| **Replay determinism** — same seed + same input log reproduces the match exactly | ✅ |
| Recorded inputs actually drive the outcome (replay differs without the log) | ✅ anti-cheat core is meaningful |
| Shrink boundary (30×30 → 28×28 at tick 100) | ✅ |
| Pellet + bounty consumption, boost tail-burn, head-on/body collision resolution | ✅ |
| Full 160-tick match runs without error | ✅ |

## What Failed / Findings

1. **Canvas distortion breaks input mapping.** First layout put HUD + controls *in-flow* inside the 16:9 box — the canvas got stretched non-uniformly and corner clicks mapped to wrong cells. **Fix (applied): HUD and controls overlay the canvas absolutely** so the canvas owns the full 16:9 area. This is a mandatory layout rule for the real build.
2. **Default spawn forces an instant head-on.** Spawning snakes facing each other made every bot-vs-bot match end in ~18 ticks. The real game needs spawn positions/directions that guarantee early separation (e.g., opposite corners, random safe directions).

## Constraints Discovered

- Nimiq Pay is portrait-locked; the user must hold the phone **landscape** for the rotated view to appear upright — content must be designed for that physical behavior, and a portrait-native fallback mode may be worth adding for usability.
- The WebView will deliver touch events fine in a normal browser, but **real-device behavior is NOT verified** (rotation resize events, safe areas/notches, touch delivery inside Nimiq Pay's actual WebView).
- Replay verification requires a deterministic sim with **no wall-clock or floating-point dependence** — the prototype's integer + seeded-RNG design satisfies this and must be preserved server-side.
- Player-vs-bot matches in the spike have no server; the Colyseus room is the remaining unverified piece.

## Open Questions

- Does Nimiq Pay's WebView preserve `@media (orientation)` and dispatch correct resize/visualViewport events for the rotated container?
- Touch coordinate mapping on a real device with notches/safe areas — need a device pass.
- Colyseus authoritative room: tick loop, input buffering, latency tolerance for 110ms-tick gameplay — scaffold + device test required.

## Decision

- [x] **Proceed with this approach** — rotation + input remapping + deterministic replay verification are all viable; fix the two findings (overlay layout ✓ applied, spawn layout) in the real build.
- [ ] Change approach (n/a)
- [ ] Reject technology (n/a)

## Impact On Architecture

- **Layout rule:** HUD/controls must absolutely overlay the canvas; never in-flow inside the game area.
- **Sim engine:** must be a pure deterministic module shared between client and server (single source of truth), integer math, seeded RNG — replay verification becomes a server API that accepts an input log and returns the authoritative result.
- **Spawn:** guarantee early separation (opposite corners, seeded safe directions) to avoid instant head-ons.
- **Next spikes:** (1) Colyseus 2-player room with authoritative tick + input log capture; (2) real-device pass in Nimiq Pay (rotation, safe areas, touch).

## Skeleton Disposition

- [x] **Preserved as reference prototype** (`spike/index.html`) — the sim core, rotation math, and input remapping are directly reusable in the React/Phaser build.
