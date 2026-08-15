import Phaser from 'phaser';
import { GRID_SIZE } from '@snake/sim';
import type { GameState } from '@snake/sim';

/**
 * Render-only Phaser scene (match-scene-spec §1, M4): draws sim state every
 * tick, never writes back. Lawn League art (grass tiles, character snakes,
 * apples/stars) replaces these placeholders in W2.
 */
export class MatchScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;

  // 1280x720 canvas; the 30x30 arena is a centered 720x720 square.
  private readonly cellPx = 720 / GRID_SIZE;
  private readonly offX = (1280 - 720) / 2;
  private readonly offY = 0;

  constructor() {
    super('Match');
  }

  create() {
    this.g = this.add.graphics();
  }

  renderState(state: GameState) {
    const g = this.g;
    g.clear();

    // Grass (placeholder green — Lawn League tile in W2).
    g.fillStyle(0x8fd46a, 1);
    g.fillRect(this.offX, this.offY, 720, 720);

    // Shrink boundary — dashed "painted" line (solid for now).
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRect(
      this.offX + state.bounds.x0 * this.cellPx,
      this.offY + state.bounds.y0 * this.cellPx,
      (state.bounds.x1 - state.bounds.x0 + 1) * this.cellPx,
      (state.bounds.y1 - state.bounds.y0 + 1) * this.cellPx,
    );

    // Pellets — lemon dots + golden bounty stars (apple/star art in W2).
    for (const p of state.pellets) {
      g.fillStyle(p.type === 1 ? 0xf2a93b : 0xf7e04d, 1);
      g.fillCircle(
        this.offX + (p.x + 0.5) * this.cellPx,
        this.offY + (p.y + 0.5) * this.cellPx,
        this.cellPx * 0.32,
      );
    }

    // Snakes — coral (you) / teal (bot) rounded segments + head highlight.
    const colors = [0xff6b6b, 0x3ddc84];
    for (const sn of state.snakes) {
      if (!sn.alive) continue;
      g.fillStyle(colors[sn.id] ?? 0x3ddc84, 1);
      for (const c of sn.cells) {
        g.fillRoundedRect(
          this.offX + c.x * this.cellPx + 1,
          this.offY + c.y * this.cellPx + 1,
          this.cellPx - 2,
          this.cellPx - 2,
          4,
        );
      }
      const h = sn.cells[0];
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(
        this.offX + (h.x + 0.35) * this.cellPx,
        this.offY + (h.y + 0.35) * this.cellPx,
        this.cellPx * 0.18,
      );
    }
  }
}
