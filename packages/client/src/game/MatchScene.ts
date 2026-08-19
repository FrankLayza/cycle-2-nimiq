import Phaser from 'phaser';
import { GRID_SIZE, TICK_MS } from '@snake/sim';
import { interpolateSnapshots } from './renderState';
import type { RenderSnapshot } from './renderState';

/**
 * Render-only Phaser scene (match-scene-spec §1, M4): draws sim state every
 * tick, never writes back. Lawn League art (grass tiles, character snakes,
 * apples/stars) replaces these placeholders in W2.
 */
export class MatchScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private previous: RenderSnapshot | null = null;
  private current: RenderSnapshot | null = null;
  private currentReceivedAt = 0;

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

  submitSnapshot(snapshot: RenderSnapshot, receivedAt?: number) {
    const timestamp = receivedAt ?? this.game?.loop?.now ?? performance.now();
    if (this.current && snapshot.tick < this.current.tick) return;
    if (this.current && snapshot.tick === this.current.tick) {
      this.current = snapshot;
      return;
    }
    this.previous = this.current;
    this.current = snapshot;
    this.currentReceivedAt = timestamp;
  }

  update(time: number) {
    if (!this.current) return;
    const alpha = (time - this.currentReceivedAt) / TICK_MS;
    this.renderSnapshot(interpolateSnapshots(this.previous, this.current, alpha));
  }

  private renderSnapshot(state: RenderSnapshot) {
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
    for (const sn of state.snakes) {
      if (!sn.alive) continue;
      const color = Phaser.Display.Color.HexStringToColor(sn.color || (sn.id === 0 ? '#ff6b6b' : '#3ddc84'));
      g.fillStyle(color.color, 1);
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
      if (!h) continue;
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(
        this.offX + (h.x + 0.35) * this.cellPx,
        this.offY + (h.y + 0.35) * this.cellPx,
        this.cellPx * 0.18,
      );
    }
  }
}
