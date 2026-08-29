# Third-party assets

## tiny-town.png

Kenney "Tiny Town" (v1.1) — `Tilemap/tilemap_packed.png`, copied verbatim.

- Source: https://kenney.nl/assets/tiny-town
- Author: Kenney (https://www.kenney.nl)
- License: **CC0 1.0 Universal** (public domain dedication) —
  https://creativecommons.org/publicdomain/zero/1.0/

CC0 imposes no conditions, so no attribution is legally required. Kenney asks for
a voluntary credit, which this file provides; credit Kenney or kenney.nl in any
public-facing credits screen.

Sheet layout, needed by `Phaser.Loader.spritesheet`:

| Property | Value |
|---|---|
| Tile size | 16 x 16 px |
| Spacing / margin | 0 (this is the *packed* sheet) |
| Grid | 12 columns x 11 rows |
| Total frames | 132 (indices 0-131, row-major) |

Frames currently used, from `packages/client/src/game/turf.ts`:

| Frame | Contents |
|---|---|
| 0 | Plain grass |
| 1 | Grass with darker tufts |
| 2 | Grass with small flowers |

The unpacked sheet (`tilemap.png`, 1 px spacing) and the individual `Tiles/`
PNGs are deliberately not vendored — the packed sheet is a single 5 KB request
and needs no spacing parameters.
