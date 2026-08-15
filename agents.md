# agents.md — Rules for AI agents working in this repo

These rules apply to every AI model (Codebuff, Codex, Copilot, etc.) editing this repository.
Read `memory.md` first, then `docs/AI_HANDOFF.md` before doing any work.

---

## Rule 1 — Tailwind v4 canonical class names (MANDATORY)

When writing, editing, or refactoring UI, use the **latest canonical Tailwind utility classes — i.e. the Tailwind v4 class names**. Never write v3-only aliases or deprecated classes.

### Renamed utilities (v3 → v4) — always use the v4 name

| v3 (deprecated / wrong) | v4 (canonical — use this) |
|---|---|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `drop-shadow-sm` | `drop-shadow-xs` |
| `drop-shadow` | `drop-shadow-sm` |
| `blur-sm` | `blur-xs` |
| `blur` | `blur-sm` |
| `backdrop-blur-sm` | `backdrop-blur-xs` |
| `backdrop-blur` | `backdrop-blur-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |
| `outline-none` (invisible a11y outline) | `outline-hidden` |
| `ring` (3px) | `ring-3` |
| `bg-gradient-to-*` | `bg-linear-to-*` |

### Removed utilities — use the modern alternative

| v3 (removed) | v4 (use) |
|---|---|
| `bg-opacity-50` | `bg-black/50` (opacity modifier) |
| `text-opacity-*` | `text-black/50` |
| `border-opacity-*` | `border-black/50` |
| `divide-opacity-*` | `divide-black/50` |
| `ring-opacity-*` | `ring-black/50` |
| `placeholder-opacity-*` | `placeholder-black/50` |
| `flex-shrink-*` / `flex-grow-*` | `shrink-*` / `grow-*` |
| `overflow-ellipsis` | `text-ellipsis` |
| `decoration-slice` / `decoration-clone` | `box-decoration-slice` / `box-decoration-clone` |

### Other v4 semantics to respect

- Import Tailwind with `@import "tailwindcss"` — never `@tailwind base/components/utilities`.
- Configure via CSS-first `@theme` — there is **no `tailwind.config.js`** in v4.
- Custom utilities use `@utility`, not `@layer utilities`.
- The important modifier goes at the **end**: `flex!`, not `!flex`.
- CSS-var arbitrary values use parentheses: `bg-(--brand-color)`, not `bg-[--brand-color]`.
- `border-*` / `divide-*` default to `currentColor` in v4 — always specify a color (e.g. `border-gray-200`).
- Use the Vite plugin (`@tailwindcss/vite`) when wiring Tailwind into the client.
- When in doubt about a class name, check `tailwindcss.com/docs` before writing it. Do not guess v3 names.

---

## Rule 2 — Never break sim determinism

`packages/sim` is the single source of truth. It must stay **pure, integer-only, and zero-runtime-deps**. Anything that changes sim behavior requires a `SIM_VERSION` bump (`packages/sim/src/version.ts`) — the golden-hash tests (`packages/sim/test/golden.test.ts`) will fail otherwise. Do not "fix" a failing golden test by changing the hash; change the version or the code intentionally.

## Rule 3 — Respect dependency direction

`server → sim` · `client → sim`. The client and server never import each other. The sim never imports anything at runtime.

## Rule 4 — Don't bump pinned tooling casually

- TypeScript stays on **5.9** (typescript-eslint's peer range is `<6.1.0`; TS 7 breaks lint).
- Colyseus stays on the **0.16 ecosystem** (colyseus 0.16.5 / @colyseus/core 0.16.24 / @colyseus/schema 3.0.76 / @colyseus/ws-transport 0.16.5 / colyseus.js 0.16.22) — 0.16.25 core is a broken publish and 0.17 has no matching client. Schema classes use `defineTypes()` + `declare` fields; do **not** switch to decorators.

## Rule 5 — Verify before finishing

Run `pnpm typecheck` and `pnpm test` (and `pnpm --filter @snake/client build` for UI changes) and make sure everything passes before calling a task done.

## Rule 6 — Keep durable memory synchronized (HIOS)

- The living document `COMPETITIVE_SNAKE_GAME.md` is the source of truth; log new decisions as D-rows in its decision table.
- Update `docs/PROJECT_PROGRESS.md` and `docs/AI_HANDOFF.md` at the end of each meaningful session (`/handoff` equivalent).

## Rule 7 — Safety & scope

- **The house never holds player funds** (D2/D4): payouts only ever go OUT from the seeded pool. Never build escrow or a rake.
- **No bots in rewarded modes** (D5/D28): bots are free-play only.
- **HUD/controls overlay the canvas absolutely** (D11) — never in-flow inside the game area.
- No secrets in the repo; `.env.example` documents names with dummy values only.
- Protect the MVP (submission target Sep 6, hard deadline Sep 11). When scope creeps, recommend cutting.
