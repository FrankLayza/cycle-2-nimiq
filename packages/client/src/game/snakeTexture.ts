import Phaser from 'phaser';
import { PIECE_ORDER, SNAKE_SPRITE_PX, snakeFrame, sourceRect } from './snakeSprites';
import type { PieceName } from './snakeSprites';
import snakeSpriteUrl from '../assets/snake-sprites.png';

/**
 * Builds the snake sprite atlas by extracting frames from the external
 * Snake.png sprite sheet.
 *
 * The source sheet has 3 colour sections (yellow, green, blue). Seats 0-2 map
 * directly. Seat 3 (Violet) reuses the yellow row and is tinted purple at
 * blit time so all four seats are visually distinct.
 *
 * The atlas is a single canvas with `seats × pieces` frames of 16px, so every
 * snake in the match shares one texture and the whole field batches into very
 * few draw calls.
 */

export const SNAKE_TEXTURE_KEY = 'snake-pieces';
export const SNAKE_SHEET_URL = snakeSpriteUrl;

/** Number of seats to generate atlas frames for. */
const SEAT_COUNT = 4;

/**
 * Tint an ImageData region to a target hue. Used only for seat 3 (Violet),
 * which has no native colour on the sheet.
 *
 * The approach: shift hue by converting each pixel from RGB to HSL, replacing
 * the hue with the target, then converting back. Saturation and lightness are
 * preserved so the pixel-art shading reads correctly.
 */
function tintRegion(
  data: Uint8ClampedArray,
  width: number,
  ox: number,
  oy: number,
  tileSize: number,
  targetHue: number
): void {
  for (let py = 0; py < tileSize; py++) {
    for (let px = 0; px < tileSize; px++) {
      const idx = ((oy + py) * width + (ox + px)) * 4;
      if (data[idx + 3] === 0) continue;

      let r = data[idx] / 255;
      let g = data[idx + 1] / 255;
      let b = data[idx + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;

      if (max === min) continue; // achromatic — leave untouched

      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      // Convert target hue + original s/l back to RGB
      const h = targetHue / 360;
      const hue2rgb = (p: number, q: number, t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);

      data[idx] = Math.round(r * 255);
      data[idx + 1] = Math.round(g * 255);
      data[idx + 2] = Math.round(b * 255);
    }
  }
}

export function ensureSnakeTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SNAKE_TEXTURE_KEY)) return;

  const sourceTexture = scene.textures.get('snake-sheet');
  if (!sourceTexture || sourceTexture.key === '__MISSING') return;

  const sourceImage = sourceTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  if (!sourceImage) return;

  const size = SNAKE_SPRITE_PX;
  const cols = PIECE_ORDER.length;  // 4 pieces
  const rows = SEAT_COUNT;          // 4 seats
  const atlasWidth = cols * size;
  const atlasHeight = rows * size;

  const texture = scene.textures.createCanvas(SNAKE_TEXTURE_KEY, atlasWidth, atlasHeight);
  if (!texture) return;

  const ctx = texture.getContext();

  // Draw a temporary canvas from the source to read pixel data
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = sourceImage.width || 256;
  tmpCanvas.height = sourceImage.height || 352;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  tmpCtx.imageSmoothingEnabled = false;
  tmpCtx.drawImage(sourceImage, 0, 0);

  // Blit each seat/piece from the source sheet into the atlas
  ctx.imageSmoothingEnabled = false;
  for (let seat = 0; seat < SEAT_COUNT; seat++) {
    for (let pieceIdx = 0; pieceIdx < PIECE_ORDER.length; pieceIdx++) {
      const pieceName = PIECE_ORDER[pieceIdx] as PieceName;
      const src = sourceRect(seat, pieceName);
      const destX = pieceIdx * size;
      const destY = seat * size;
      ctx.drawImage(tmpCanvas, src.x, src.y, src.w, src.h, destX, destY, size, size);
    }
  }

  // Tint seat 3 (Violet) — hue ≈ 275° (purple)
  const imageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight);
  for (let pieceIdx = 0; pieceIdx < PIECE_ORDER.length; pieceIdx++) {
    tintRegion(imageData.data, atlasWidth, pieceIdx * size, 3 * size, size, 275);
  }
  ctx.putImageData(imageData, 0, 0);

  // Register individual frames
  for (let seat = 0; seat < SEAT_COUNT; seat++) {
    for (let piece = 0; piece < PIECE_ORDER.length; piece++) {
      texture.add(snakeFrame(seat, piece), 0, piece * size, seat * size, size, size);
    }
  }

  texture.refresh();
}
