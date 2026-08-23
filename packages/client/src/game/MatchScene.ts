import Phaser from 'phaser';
import { GRID_SIZE, TICK_MS } from '@snake/sim';
import { interpolateSnapshots } from './renderState';
import type { RenderCell, RenderSnapshot } from './renderState';

export class MatchScene extends Phaser.Scene {
  private field!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Graphics;
  private previous: RenderSnapshot | null = null;
  private current: RenderSnapshot | null = null;
  private currentReceivedAt = 0;
  private decoratedSeed: number | null = null;
  private previousPellets = new Set<string>();
  private particles: Array<{ x: number; y: number; born: number; color: number }> = [];
  private previousBounds: RenderSnapshot['bounds'] | null = null;
  private boundaryFlashUntil = 0;

  private cellPx = 720 / GRID_SIZE;
  private offX = 280;
  private offY = 0;
  private fieldSize = 720;

  constructor() { super('Match'); }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.fieldSize = Math.min(width, height);
    this.cellPx = this.fieldSize / GRID_SIZE;
    this.offX = (width - this.fieldSize) / 2;
    this.offY = (height - this.fieldSize) / 2;
    this.cameras.main.setBackgroundColor('#dff0d5');
    this.field = this.add.graphics();
    this.actors = this.add.graphics();
  }

  submitSnapshot(snapshot: RenderSnapshot, receivedAt?: number) {
    const timestamp = receivedAt ?? this.game?.loop?.now ?? performance.now();
    if (this.current && snapshot.tick < this.current.tick) return;
    if (this.current && snapshot.tick === this.current.tick) { this.current = snapshot; return; }
    this.previous = this.current;
    this.current = snapshot;
    this.currentReceivedAt = timestamp;
    if (this.decoratedSeed !== snapshot.seed) this.drawField(snapshot.seed);
  }

  update(time: number) {
    if (!this.current) return;
    const alpha = (time - this.currentReceivedAt) / TICK_MS;
    this.renderSnapshot(interpolateSnapshots(this.previous, this.current, alpha), time);
  }

  private drawField(seed: number) {
    this.decoratedSeed = seed;
    const g = this.field;
    g.clear();
    const radius = Math.max(16, this.fieldSize * 0.025);
    const rim = Math.max(8, this.fieldSize * 0.014);
    g.fillStyle(0x16351e, 0.28);
    g.fillRoundedRect(this.offX + 8, this.offY + 12, this.fieldSize, this.fieldSize, radius + 4);
    g.fillStyle(0x315f24, 1);
    g.fillRoundedRect(this.offX, this.offY, this.fieldSize, this.fieldSize, radius);
    g.fillStyle(0x75bd59, 1);
    g.fillRoundedRect(this.offX + rim, this.offY + rim, this.fieldSize - rim * 2, this.fieldSize - rim * 2, radius - rim / 2);
    for (let x = 0; x < GRID_SIZE; x++) {
      g.fillStyle(x % 2 === 0 ? 0xffffff : 0x315f24, x % 2 === 0 ? 0.045 : 0.035);
      g.fillRect(this.offX + rim + x * this.cellPx, this.offY + rim, this.cellPx, this.fieldSize - rim * 2);
    }
    for (let y = 0; y < GRID_SIZE; y += 3) {
      g.fillStyle(0x2f7f3f, 0.045);
      g.fillRect(this.offX + rim, this.offY + rim + y * this.cellPx, this.fieldSize - rim * 2, this.cellPx * 0.42);
    }

    let value = seed || 1;
    const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 0x100000000; };
    for (let i = 0; i < 34; i++) {
      const inset = this.fieldSize / 60;
      const x = this.offX + inset + random() * (this.fieldSize - inset * 2);
      const y = this.offY + inset + random() * (this.fieldSize - inset * 2);
      const radius = 1.5 + random() * 1.4;
      g.fillStyle(0xffffff, 0.68);
      for (let petal = 0; petal < 4; petal++) {
        const angle = petal * Math.PI / 2;
        g.fillCircle(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3, radius);
      }
      g.fillStyle(0xf7e04d, 0.9);
      g.fillCircle(x, y, 1.8);
    }

    g.lineStyle(2, 0xffffff, 0.16);
    g.strokeRoundedRect(this.offX + rim, this.offY + rim, this.fieldSize - rim * 2, this.fieldSize - rim * 2, radius - rim / 2);
    g.lineStyle(3, 0x183d22, 0.42);
    g.strokeRoundedRect(this.offX, this.offY, this.fieldSize, this.fieldSize, radius);
  }

  private renderSnapshot(state: RenderSnapshot, time: number) {
    const g = this.actors;
    g.clear();
    this.drawBoundary(g, state);
    if (this.previousBounds && (this.previousBounds.x0 !== state.bounds.x0 || this.previousBounds.x1 !== state.bounds.x1 || this.previousBounds.y0 !== state.bounds.y0 || this.previousBounds.y1 !== state.bounds.y1)) this.boundaryFlashUntil = time + 260;
    this.previousBounds = state.bounds;

    const pelletKeys = new Set(state.pellets.map((p) => `${p.x}:${p.y}`));
    for (const key of this.previousPellets) {
      if (!pelletKeys.has(key)) {
        const [px, py] = key.split(':').map(Number);
        for (let i = 0; i < 6; i++) this.particles.push({ x: this.offX + (px + 0.5) * this.cellPx, y: this.offY + (py + 0.5) * this.cellPx, born: time + i * 12, color: 0xf7e04d });
      }
    }
    this.previousPellets = pelletKeys;

    for (const pellet of state.pellets) {
      const x = this.offX + (pellet.x + 0.5) * this.cellPx;
      const y = this.offY + (pellet.y + 0.5) * this.cellPx + Math.sin(time / 250 + pellet.x) * 1.5;
      g.fillStyle(0x183d22, 0.22);
      g.fillEllipse(x + 1, y + this.cellPx * 0.24, this.cellPx * 0.42, this.cellPx * 0.16);
      if (pellet.type === 1) this.drawStar(g, x, y, this.cellPx * 0.42);
      else this.drawApple(g, x, y);
    }

    for (const snake of state.snakes) {
      // Keep the final authoritative position visible after elimination. The
      // result overlay can arrive on the same tick as the collision, and
      // removing the dead snake here makes a valid loss look unexplained.
      if (!snake.cells[0]) continue;
      const base = Phaser.Display.Color.HexStringToColor(snake.color || (snake.id === 0 ? '#ff6b6b' : '#3ddc84')).color;
      const outline = snake.id === 0 ? 0xb93e4b : 0x18885d;
      g.setAlpha(snake.alive ? 1 : 0.38);
      for (const cell of snake.cells) {
        const shadow = this.center(cell);
        g.fillStyle(0x183d22, snake.alive ? 0.18 : 0.08);
        g.fillEllipse(shadow.x + 1.5, shadow.y + this.cellPx * 0.28, this.cellPx * 0.68, this.cellPx * 0.2);
      }
      if (snake.boosting) this.drawBoostTrail(g, snake.cells, base);
      for (let index = snake.cells.length - 1; index >= 1; index--) this.drawSegment(g, snake.cells[index], base, outline, index);
      this.drawHead(g, snake.cells[0], snake.cells[1], base, outline, snake.id);
      g.setAlpha(1);
    }
    this.drawParticles(g, time);
    if (time < this.boundaryFlashUntil) {
      const alpha = (this.boundaryFlashUntil - time) / 260;
      g.fillStyle(0xffffff, alpha * 0.18);
      g.fillRect(this.offX, this.offY, this.fieldSize, this.fieldSize);
    }
  }

  private drawParticles(g: Phaser.GameObjects.Graphics, time: number) {
    this.particles = this.particles.filter((p) => time - p.born < 420);
    for (const p of this.particles) {
      const progress = Math.max(0, time - p.born) / 420;
      const angle = (p.born % 6) * 1.05;
      g.fillStyle(p.color, Math.max(0, 0.8 * (1 - progress)));
      g.fillCircle(p.x + Math.cos(angle) * progress * 18, p.y + Math.sin(angle) * progress * 18, 2.5 * (1 - progress * 0.6));
    }
  }

  private drawBoundary(g: Phaser.GameObjects.Graphics, state: RenderSnapshot) {
    const x = this.offX + state.bounds.x0 * this.cellPx;
    const y = this.offY + state.bounds.y0 * this.cellPx;
    const width = (state.bounds.x1 - state.bounds.x0 + 1) * this.cellPx;
    const height = (state.bounds.y1 - state.bounds.y0 + 1) * this.cellPx;
    const urgency = Math.max(0, 1 - (state.bounds.x1 - state.bounds.x0 + 1) / GRID_SIZE);
    g.lineStyle(8, urgency > 0.45 ? 0xf7e04d : 0x183d22, 0.18 + urgency * 0.12);
    g.strokeRect(x, y, width, height);
    g.lineStyle(4, urgency > 0.45 ? 0xfff4a8 : 0xffffff, 0.78 + urgency * 0.12);
    const dash = 18; const gap = 11;
    for (let dx = 0; dx < width; dx += dash + gap) { g.lineBetween(x + dx, y, Math.min(x + dx + dash, x + width), y); g.lineBetween(x + dx, y + height, Math.min(x + dx + dash, x + width), y + height); }
    for (let dy = 0; dy < height; dy += dash + gap) { g.lineBetween(x, y + dy, x, Math.min(y + dy + dash, y + height)); g.lineBetween(x + width, y + dy, x + width, Math.min(y + dy + dash, y + height)); }
  }

  private center(cell: RenderCell) { return { x: this.offX + (cell.x + 0.5) * this.cellPx, y: this.offY + (cell.y + 0.5) * this.cellPx }; }

  private drawSegment(g: Phaser.GameObjects.Graphics, cell: RenderCell, base: number, outline: number, index: number) {
    const { x, y } = this.center(cell);
    const size = this.cellPx * 0.84;
    g.fillStyle(outline, 1); g.fillRoundedRect(x - size / 2 - 1.5, y - size / 2 - 1.5, size + 3, size + 3, 8);
    g.fillStyle(base, 1); g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 7);
    g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(x - size * 0.28, y - size * 0.3, size * 0.46, size * 0.18, 4);
    g.fillStyle(0x183d22, 0.13); g.fillRoundedRect(x - size * 0.24, y + size * 0.22, size * 0.42, size * 0.12, 3);
    if (index % 3 === 0) { g.fillStyle(outline, 0.4); g.fillCircle(x + size * 0.2, y + size * 0.2, 2.2); }
  }

  private drawHead(g: Phaser.GameObjects.Graphics, head: RenderCell, neck: RenderCell | undefined, base: number, outline: number, id: number) {
    const { x, y } = this.center(head);
    const size = this.cellPx * 1.08;
    const dx = neck ? head.x - neck.x : 1; const dy = neck ? head.y - neck.y : 0;
    g.fillStyle(0x183d22, 0.18); g.fillEllipse(x + 2, y + size * 0.42, size * 0.72, size * 0.2);
    g.fillStyle(outline, 1); g.fillCircle(x, y, size * 0.53);
    g.fillStyle(base, 1); g.fillCircle(x, y, size * 0.47);
    g.fillStyle(0xffffff, 0.24); g.fillEllipse(x - size * 0.12, y - size * 0.18, size * 0.42, size * 0.2);
    const sideX = dy * size * 0.19; const sideY = -dx * size * 0.19;
    const forwardX = dx * size * 0.17; const forwardY = dy * size * 0.17;
    for (const side of [-1, 1]) {
      const eyeX = x + forwardX + sideX * side; const eyeY = y + forwardY + sideY * side;
      g.fillStyle(0xffffff, 1); g.fillCircle(eyeX, eyeY, size * 0.13);
      g.fillStyle(0x1f2937, 1); g.fillCircle(eyeX + dx * 2, eyeY + dy * 2, size * 0.058);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(eyeX + dx * 3 - 1, eyeY + dy * 3 - 1, 1.2);
    }
    if (id === 0) { g.fillStyle(0xffc0c8, 0.65); g.fillCircle(x - sideX * 1.4 - dx * 2, y - sideY * 1.4 - dy * 2, 2.2); }
  }

  private drawApple(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0xb93e4b, 1); g.fillCircle(x, y + 1, this.cellPx * 0.28);
    g.fillStyle(0xff6b6b, 1); g.fillCircle(x - 1.5, y - 1, this.cellPx * 0.23);
    g.lineStyle(2, 0x5e3a21, 1); g.lineBetween(x, y - 5, x + 1, y - 10);
    g.fillStyle(0x2f8c4e, 1); g.fillEllipse(x + 4, y - 8, 7, 4);
    g.fillStyle(0xffffff, 0.55); g.fillCircle(x - 4, y - 4, 2);
  }

  private drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number) {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? radius : radius * 0.45; const a = -Math.PI / 2 + i * Math.PI / 5; points.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r)); }
    g.fillStyle(0xd49b18, 1); g.fillPoints(points.map((point) => new Phaser.Geom.Point(point.x + 1.5, point.y + 2)), true);
    g.fillStyle(0xf7e04d, 1); g.fillPoints(points, true);
    g.fillStyle(0xffffff, 0.65); g.fillCircle(x - 2.5, y - 3.5, 2);
  }

  private drawBoostTrail(g: Phaser.GameObjects.Graphics, cells: RenderCell[], base: number) {
    for (let index = 1; index < Math.min(cells.length, 6); index++) {
      const { x, y } = this.center(cells[index]);
      g.fillStyle(base, Math.max(0.08, 0.3 - index * 0.045));
      g.fillCircle(x, y, this.cellPx * (0.4 - index * 0.035));
    }
  }
}
