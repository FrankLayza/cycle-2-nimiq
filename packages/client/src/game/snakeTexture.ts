import Phaser from 'phaser';
import { PIECE_ORDER, PX, SNAKE_SPRITE_PX, pieceMask, snakeFrame } from './snakeSprites';
import type { PieceName } from './snakeSprites';
import { PALETTE, SEAT_SKINS, outlineOf } from './theme';

/**
 * Builds the snake sprite atlas at runtime from the procedural masks.
 *
 * One canvas, `pieces x seats` frames of 16px, so every snake in the match shares
 * a single texture and the whole field batches into very few draw calls. Colours
 * come from `SEAT_SKINS`, which derives shade and highlight from each seat's base
 * hue — so a fifth seat or a server-supplied colour needs no new art.
 */

export const SNAKE_TEXTURE_KEY = 'snake-pieces';

/** Split a 0xRRGGBB colour into the byte channels ImageData expects. */
function channels(color: number): [number, number, number] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

export function ensureSnakeTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SNAKE_TEXTURE_KEY)) return;

  const size = SNAKE_SPRITE_PX;
  const cols = PIECE_ORDER.length;
  const rows = SEAT_SKINS.length;
  const texture = scene.textures.createCanvas(SNAKE_TEXTURE_KEY, cols * size, rows * size);
  if (!texture) return;

  const context = texture.getContext();
  const image = context.createImageData(cols * size, rows * size);

  SEAT_SKINS.forEach((skin, seat) => {
    const palette: Record<number, [number, number, number] | null> = {
      [PX.empty]: null,
      [PX.outline]: channels(outlineOf(skin.base)),
      [PX.base]: channels(skin.base),
      [PX.highlight]: channels(skin.highlight),
      [PX.eye]: channels(PALETTE.white),
      [PX.pupil]: channels(PALETTE.inkDeep),
    };

    PIECE_ORDER.forEach((name: PieceName, piece) => {
      const mask = pieceMask(name, skin.pattern);
      const originX = piece * size;
      const originY = seat * size;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const rgb = palette[mask[y * size + x]];
          if (!rgb) continue;
          const offset = ((originY + y) * cols * size + (originX + x)) * 4;
          image.data[offset] = rgb[0];
          image.data[offset + 1] = rgb[1];
          image.data[offset + 2] = rgb[2];
          image.data[offset + 3] = 255;
        }
      }
    });
  });

  context.putImageData(image, 0, 0);

  for (let seat = 0; seat < rows; seat++) {
    for (let piece = 0; piece < cols; piece++) {
      texture.add(snakeFrame(seat, piece), 0, piece * size, seat * size, size, size);
    }
  }

  texture.refresh();
}
