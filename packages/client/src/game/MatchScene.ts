import Phaser from 'phaser';
import { GRID_SIZE, TICK_MS } from '@snake/sim';
import { interpolateSnapshots } from './renderState';
import type { RenderCell, RenderSnapshot } from './renderState';

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

interface ParticleFX {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  color: number;
  size: number;
}

export class MatchScene extends Phaser.Scene {
  private field!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Graphics;
  private previous: RenderSnapshot | null = null;
  private current: RenderSnapshot | null = null;
  private currentReceivedAt = 0;
  private decoratedSeed: number | null = null;
  private previousPellets = new Set<string>();
  private particles: ParticleFX[] = [];
  private scorePopups: FloatingPopup[] = [];
  private previousBounds: RenderSnapshot['bounds'] | null = null;
  private boundaryFlashUntil = 0;

  private cellPx = 720 / GRID_SIZE;
  private offX = 280;
  private offY = 0;
  private fieldSize = 720;

  constructor() {
    super('Match');
  }

  create() {
    this.updateDimensions();
    this.cameras.main.setBackgroundColor('#d8ecd0');
    this.field = this.add.graphics();
    this.actors = this.add.graphics();

    this.scale.on('resize', () => {
      this.updateDimensions();
      if (this.decoratedSeed !== null) this.drawField(this.decoratedSeed);
    });
  }

  private updateDimensions() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.fieldSize = Math.min(width, height);
    this.cellPx = this.fieldSize / GRID_SIZE;
    this.offX = (width - this.fieldSize) / 2;
    this.offY = (height - this.fieldSize) / 2;
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

    const radius = Math.max(20, this.fieldSize * 0.035);
    const rim = Math.max(10, this.fieldSize * 0.016);

    // 1. Stadium Outer Depth Shadow
    g.fillStyle(0x0f2916, 0.35);
    g.fillRoundedRect(this.offX + 10, this.offY + 16, this.fieldSize, this.fieldSize, radius + 6);

    // 2. Stadium Outer Bevel Rim
    g.fillStyle(0x28521e, 1);
    g.fillRoundedRect(this.offX, this.offY, this.fieldSize, this.fieldSize, radius);

    // 3. Inner Turf Bevel (recessed pitch)
    g.fillStyle(0x1d4016, 1);
    g.fillRoundedRect(this.offX + rim * 0.5, this.offY + rim * 0.5, this.fieldSize - rim, this.fieldSize - rim, radius - 2);

    // 4. Main Lush Grass Surface
    g.fillStyle(0x6eb752, 1);
    g.fillRoundedRect(this.offX + rim, this.offY + rim, this.fieldSize - rim * 2, this.fieldSize - rim * 2, radius - rim * 0.6);

    // 5. Alternating Mowed Lawn Stripes
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x % 2 === 0) {
        g.fillStyle(0x7ecc5f, 0.35);
      } else {
        g.fillStyle(0x56993d, 0.25);
      }
      g.fillRect(this.offX + rim + x * this.cellPx, this.offY + rim, this.cellPx, this.fieldSize - rim * 2);
    }

    // 6. Cross Lawn Texture Bands
    for (let y = 0; y < GRID_SIZE; y += 4) {
      g.fillStyle(0x407c2c, 0.08);
      g.fillRect(this.offX + rim, this.offY + rim + y * this.cellPx, this.fieldSize - rim * 2, this.cellPx * 0.7);
    }

    // 7. Subtle Pitch Chalk Markings (Center Circle & Pitch Perimeter)
    const centerX = this.offX + this.fieldSize / 2;
    const centerY = this.offY + this.fieldSize / 2;
    g.lineStyle(2, 0xffffff, 0.14);
    g.strokeCircle(centerX, centerY, this.cellPx * 3.5);
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(centerX, centerY, 3.5);

    // 8. Seeded 2.5D Daisies & Clovers
    let value = seed || 12345;
    const random = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    };

    for (let i = 0; i < 40; i++) {
      const inset = this.fieldSize * 0.035;
      const fx = this.offX + inset + random() * (this.fieldSize - inset * 2);
      const fy = this.offY + inset + random() * (this.fieldSize - inset * 2);
      const isClover = i % 3 === 0;

      if (isClover) {
        // Clover shadow
        g.fillStyle(0x1a381c, 0.25);
        g.fillCircle(fx + 1, fy + 2, 4);
        // Clover leaves
        g.fillStyle(0x438f2a, 0.85);
        for (let leaf = 0; leaf < 3; leaf++) {
          const angle = (leaf * Math.PI * 2) / 3;
          g.fillCircle(fx + Math.cos(angle) * 2.5, fy + Math.sin(angle) * 2.5, 2.2);
        }
      } else {
        // Daisy ground shadow
        g.fillStyle(0x1a381c, 0.3);
        g.fillCircle(fx + 1.2, fy + 2, 4.5);
        // White Petals
        g.fillStyle(0xffffff, 0.88);
        for (let petal = 0; petal < 4; petal++) {
          const angle = (petal * Math.PI) / 2;
          g.fillCircle(fx + Math.cos(angle) * 3, fy + Math.sin(angle) * 3, 2.2);
        }
        // Yellow center
        g.fillStyle(0xf7e04d, 0.95);
        g.fillCircle(fx, fy, 2);
      }
    }

    // 9. Stadium Top Lip Highlight & Inner Border
    g.lineStyle(2, 0xffffff, 0.28);
    g.strokeRoundedRect(this.offX + rim, this.offY + rim, this.fieldSize - rim * 2, this.fieldSize - rim * 2, radius - rim * 0.6);
    g.lineStyle(3, 0x183d22, 0.5);
    g.strokeRoundedRect(this.offX, this.offY, this.fieldSize, this.fieldSize, radius);
  }

  private renderSnapshot(state: RenderSnapshot, time: number) {
    const g = this.actors;
    g.clear();

    // 1. Draw Active Shrinking Boundary & Forbidden Zone
    this.drawBoundary(g, state);

    if (
      this.previousBounds &&
      (this.previousBounds.x0 !== state.bounds.x0 ||
        this.previousBounds.x1 !== state.bounds.x1 ||
        this.previousBounds.y0 !== state.bounds.y0 ||
        this.previousBounds.y1 !== state.bounds.y1)
    ) {
      this.boundaryFlashUntil = time + 300;
    }
    this.previousBounds = state.bounds;

    // 2. Track Eaten Pellets for Juicy Particle FX
    const currentPelletKeys = new Set(state.pellets.map((p) => `${p.x}:${p.y}:${p.type}`));
    for (const key of this.previousPellets) {
      if (!currentPelletKeys.has(key)) {
        const [px, py, type] = key.split(':').map(Number);
        const worldX = this.offX + (px + 0.5) * this.cellPx;
        const worldY = this.offY + (py + 0.5) * this.cellPx;

        // Spawn Burst Particles
        const count = type === 1 ? 12 : 8;
        const color = type === 1 ? 0xf59e0b : 0xff686b;
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.5;
          const speed = 1.2 + Math.random() * 2.2;
          this.particles.push({
            x: worldX,
            y: worldY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            born: time,
            life: 450,
            color,
            size: 3 + Math.random() * 2.5,
          });
        }

        // Spawn Floating Score Popup
        this.scorePopups.push({
          x: worldX,
          y: worldY - 6,
          text: type === 1 ? '+3' : '+1',
          color: type === 1 ? '#f59e0b' : '#ff686b',
          born: time,
        });
      }
    }
    this.previousPellets = currentPelletKeys;

    // 3. Render 2.5D Floating Pellets
    for (const pellet of state.pellets) {
      const bob = Math.sin(time / 200 + pellet.x * 2 + pellet.y) * 2.5;
      const x = this.offX + (pellet.x + 0.5) * this.cellPx;
      const y = this.offY + (pellet.y + 0.5) * this.cellPx + bob;

      // Contact Ground Shadow (pulses inversely with floating height)
      const shadowScale = 1 - bob / 12;
      g.fillStyle(0x14351b, 0.32);
      g.fillEllipse(
        x + 1.5,
        this.offY + (pellet.y + 0.5) * this.cellPx + this.cellPx * 0.28,
        this.cellPx * 0.52 * shadowScale,
        this.cellPx * 0.2 * shadowScale
      );

      if (pellet.type === 1) {
        this.drawStar(g, x, y, this.cellPx * 0.46, time);
      } else {
        this.drawApple(g, x, y);
      }
    }

    // 4. Render 2.5D Snakes
    for (const snake of state.snakes) {
      if (!snake.cells[0]) continue;

      const baseHex = snake.color || (snake.id === 0 ? '#ff686b' : '#35c982');
      const baseColor = Phaser.Display.Color.HexStringToColor(baseHex).color;
      const darkColor = snake.id === 0 ? 0xb93e4b : 0x1d7d4c;
      const highlightColor = snake.id === 0 ? 0xff9ea0 : 0x6ee7b7;

      g.setAlpha(snake.alive ? 1 : 0.4);

      // A. Dynamic Ground Shadows for all segments
      for (const cell of snake.cells) {
        const shadow = this.center(cell);
        g.fillStyle(0x14351b, snake.alive ? 0.26 : 0.1);
        g.fillEllipse(shadow.x + 2.5, shadow.y + this.cellPx * 0.32, this.cellPx * 0.82, this.cellPx * 0.26);
      }

      // B. Boost Exhaust FX
      if (snake.boosting && snake.alive) {
        this.drawBoostTrail(g, snake.cells, baseColor, time);
      }

      // C. Continuous Segment Connectors & Body Pills
      for (let index = snake.cells.length - 1; index >= 1; index--) {
        const currentCell = snake.cells[index];
        const nextCell = snake.cells[index - 1];
        this.drawConnector(g, currentCell, nextCell, darkColor, baseColor);
        this.drawSegment(g, currentCell, baseColor, darkColor, highlightColor, index);
      }

      // D. 3D Snake Head
      this.drawHead(g, snake.cells[0], snake.cells[1], baseColor, darkColor, highlightColor, snake.id, snake.boosting);

      g.setAlpha(1);
    }

    // 5. Render Particle Bursts & Score Popups
    this.drawParticles(g, time);
    this.drawPopups(g, time);

    // 6. Arena Boundary Flash on Shrink
    if (time < this.boundaryFlashUntil) {
      const alpha = (this.boundaryFlashUntil - time) / 300;
      g.fillStyle(0xffffff, alpha * 0.22);
      g.fillRect(this.offX, this.offY, this.fieldSize, this.fieldSize);
    }
  }

  private drawParticles(g: Phaser.GameObjects.Graphics, time: number) {
    this.particles = this.particles.filter((p) => time - p.born < p.life);
    for (const p of this.particles) {
      const progress = (time - p.born) / p.life;
      const alpha = Math.max(0, 1 - progress);
      const currentX = p.x + p.vx * progress * 24;
      const currentY = p.y + p.vy * progress * 24 - progress * 10;
      const currentSize = p.size * (1 - progress * 0.5);

      g.fillStyle(p.color, alpha);
      g.fillCircle(currentX, currentY, currentSize);
      g.fillStyle(0xffffff, alpha * 0.7);
      g.fillCircle(currentX - 0.8, currentY - 0.8, currentSize * 0.45);
    }
  }

  private drawPopups(g: Phaser.GameObjects.Graphics, time: number) {
    this.scorePopups = this.scorePopups.filter((pop) => time - pop.born < 500);
    for (const pop of this.scorePopups) {
      const progress = (time - pop.born) / 500;
      const alpha = Math.max(0, 1 - progress);
      const y = pop.y - progress * 22;
      const colorNum = pop.color === '#f59e0b' ? 0xf59e0b : 0xff686b;

      // Glowing expansion shockwave ring
      g.lineStyle(2, colorNum, alpha * 0.8);
      g.strokeCircle(pop.x, pop.y, 5 + progress * 20);

      // Star sparkle drifting up
      g.fillStyle(colorNum, alpha);
      g.fillCircle(pop.x, y, 3.5 * (1 - progress * 0.4));
      g.fillStyle(0xffffff, alpha * 0.9);
      g.fillCircle(pop.x - 0.8, y - 0.8, 1.8 * (1 - progress * 0.4));
    }
  }

  private drawBoundary(g: Phaser.GameObjects.Graphics, state: RenderSnapshot) {
    const x = this.offX + state.bounds.x0 * this.cellPx;
    const y = this.offY + state.bounds.y0 * this.cellPx;
    const width = (state.bounds.x1 - state.bounds.x0 + 1) * this.cellPx;
    const height = (state.bounds.y1 - state.bounds.y0 + 1) * this.cellPx;
    const urgency = Math.max(0, 1 - (state.bounds.x1 - state.bounds.x0 + 1) / GRID_SIZE);

    // Forbidden Zone Darkening (outside active playable grid)
    if (state.bounds.x0 > 0 || state.bounds.x1 < GRID_SIZE - 1 || state.bounds.y0 > 0 || state.bounds.y1 < GRID_SIZE - 1) {
      g.fillStyle(0x162e19, 0.45);
      // Top strip
      if (y > this.offY) g.fillRect(this.offX, this.offY, this.fieldSize, y - this.offY);
      // Bottom strip
      if (y + height < this.offY + this.fieldSize) g.fillRect(this.offX, y + height, this.fieldSize, this.offY + this.fieldSize - (y + height));
      // Left strip
      if (x > this.offX) g.fillRect(this.offX, y, x - this.offX, height);
      // Right strip
      if (x + width < this.offX + this.fieldSize) g.fillRect(x + width, y, this.offX + this.fieldSize - (x + width), height);
    }

    // 3D Beveled Boundary Curb
    // Outer drop shadow
    g.lineStyle(6, 0x0f2916, 0.4);
    g.strokeRect(x + 2, y + 3, width, height);

    // Main border
    const borderColor = urgency > 0.45 ? 0xf59e0b : 0xffffff;
    g.lineStyle(4, borderColor, 0.85 + urgency * 0.15);

    // Dashed stadium line
    const dash = 16;
    const gap = 10;
    for (let dx = 0; dx < width; dx += dash + gap) {
      g.lineBetween(x + dx, y, Math.min(x + dx + dash, x + width), y);
      g.lineBetween(x + dx, y + height, Math.min(x + dx + dash, x + width), y + height);
    }
    for (let dy = 0; dy < height; dy += dash + gap) {
      g.lineBetween(x, y + dy, x, Math.min(y + dy + dash, y + height));
      g.lineBetween(x + width, y + dy, x + width, Math.min(y + dy + dash, y + height));
    }

    // 3D Corner Stadium Posts
    const postRadius = 4.5;
    const corners = [
      { cx: x, cy: y },
      { cx: x + width, cy: y },
      { cx: x, cy: y + height },
      { cx: x + width, cy: y + height },
    ];
    for (const c of corners) {
      g.fillStyle(0x172235, 0.5);
      g.fillCircle(c.cx + 1.5, c.cy + 2, postRadius);
      g.fillStyle(borderColor, 1);
      g.fillCircle(c.cx, c.cy, postRadius);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(c.cx - 1.2, c.cy - 1.2, 1.8);
    }
  }

  private center(cell: RenderCell) {
    return {
      x: this.offX + (cell.x + 0.5) * this.cellPx,
      y: this.offY + (cell.y + 0.5) * this.cellPx,
    };
  }

  private drawConnector(
    g: Phaser.GameObjects.Graphics,
    from: RenderCell,
    to: RenderCell,
    outline: number,
    base: number
  ) {
    const p1 = this.center(from);
    const p2 = this.center(to);
    const thickness = this.cellPx * 0.78;

    g.lineStyle(thickness + 4, outline, 1);
    g.lineBetween(p1.x, p1.y, p2.x, p2.y);

    g.lineStyle(thickness, base, 1);
    g.lineBetween(p1.x, p1.y, p2.x, p2.y);
  }

  private drawSegment(
    g: Phaser.GameObjects.Graphics,
    cell: RenderCell,
    base: number,
    outline: number,
    highlight: number,
    index: number
  ) {
    const { x, y } = this.center(cell);
    const size = this.cellPx * 0.88;

    // 1. Dark bottom-right shaded bevel rim
    g.fillStyle(outline, 1);
    g.fillRoundedRect(x - size / 2 - 1.5, y - size / 2 - 1.5, size + 3, size + 3, 10);

    // 2. Main 3D Spherical Body
    g.fillStyle(base, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 9);

    // 3. Top-left Specular Highlight Gloss
    g.fillStyle(0xffffff, 0.38);
    g.fillRoundedRect(x - size * 0.34, y - size * 0.36, size * 0.48, size * 0.22, 5);

    // 4. Subtle Dorsal Scale Pattern
    if (index % 2 === 0) {
      g.fillStyle(highlight, 0.45);
      g.fillCircle(x, y - size * 0.08, size * 0.16);
    }
  }

  private drawHead(
    g: Phaser.GameObjects.Graphics,
    head: RenderCell,
    neck: RenderCell | undefined,
    base: number,
    outline: number,
    _highlight: number,
    id: number,
    boosting: boolean
  ) {
    const { x, y } = this.center(head);
    const size = this.cellPx * 1.15;
    const dx = neck ? Math.sign(head.x - neck.x) : 1;
    const dy = neck ? Math.sign(head.y - neck.y) : 0;

    // 1. Head 3D Bevel Base
    g.fillStyle(outline, 1);
    g.fillCircle(x, y, size * 0.54);

    // 2. Head Main 3D Sphere
    g.fillStyle(base, 1);
    g.fillCircle(x, y, size * 0.48);

    // 3. Top-left Gloss Crescent
    g.fillStyle(0xffffff, 0.32);
    g.fillEllipse(x - size * 0.14, y - size * 0.18, size * 0.44, size * 0.24);

    // 4. Directional 3D Eyeballs & Pupils
    const sideX = dy * size * 0.22;
    const sideY = -dx * size * 0.22;
    const forwardX = dx * size * 0.18;
    const forwardY = dy * size * 0.18;

    for (const side of [-1, 1]) {
      const eyeX = x + forwardX + sideX * side;
      const eyeY = y + forwardY + sideY * side;

      // Eyeball shadow
      g.fillStyle(0x0e1624, 0.25);
      g.fillCircle(eyeX + 0.8, eyeY + 1.2, size * 0.16);

      // Eyeball white
      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX, eyeY, size * 0.15);

      // Pupil looking in direction of motion
      g.fillStyle(0x172235, 1);
      g.fillCircle(eyeX + dx * 2.2, eyeY + dy * 2.2, size * 0.075);

      // Specular Eye Glint
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(eyeX + dx * 2.8 - 1, eyeY + dy * 2.8 - 1, 1.6);
    }

    // 5. Cute Blushing Cheeks
    const cheekColor = id === 0 ? 0xffb3ba : 0xa7f3d0;
    g.fillStyle(cheekColor, 0.7);
    g.fillCircle(x - sideX * 1.5 - dx * 2, y - sideY * 1.5 - dy * 2, 2.8);
    g.fillCircle(x + sideX * 1.5 - dx * 2, y + sideY * 1.5 - dy * 2, 2.8);

    // 6. Boosting Flare
    if (boosting) {
      g.fillStyle(0xf59e0b, 0.5);
      g.fillCircle(x + forwardX * 1.6, y + forwardY * 1.6, size * 0.22);
    }
  }

  private drawApple(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Apple 3D Body
    g.fillStyle(0xa82a36, 1);
    g.fillCircle(x, y + 1.5, this.cellPx * 0.32);
    g.fillStyle(0xff4d5a, 1);
    g.fillCircle(x - 1.2, y - 1, this.cellPx * 0.27);

    // 3D Stem
    g.lineStyle(2.5, 0x4a2c11, 1);
    g.lineBetween(x, y - 4, x + 2, y - 11);

    // Shiny Leaf
    g.fillStyle(0x2f9e44, 1);
    g.fillEllipse(x + 5.5, y - 9, 8, 4.5);
    g.fillStyle(0x75d475, 0.8);
    g.fillEllipse(x + 5.5, y - 9.5, 5, 2.5);

    // Specular Highlight
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(x - 4, y - 4, 2.8);
  }

  private drawStar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    time: number
  ) {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.46;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      points.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }

    // Gold 3D Beveled Backing
    g.fillStyle(0xb45309, 1);
    g.fillPoints(
      points.map((pt) => new Phaser.Geom.Point(pt.x + 1.8, pt.y + 2.5)),
      true
    );

    // Main Golden Face
    g.fillStyle(0xf59e0b, 1);
    g.fillPoints(points, true);

    // Bright Top Facet
    g.fillStyle(0xfef08a, 0.85);
    g.fillCircle(x - 1, y - 2, radius * 0.35);

    // Rotating Sparkle Glint
    const glintAngle = time / 350;
    const glintDist = radius * 0.75;
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x + Math.cos(glintAngle) * glintDist, y + Math.sin(glintAngle) * glintDist, 2.2);
  }

  private drawBoostTrail(
    g: Phaser.GameObjects.Graphics,
    cells: RenderCell[],
    base: number,
    time: number
  ) {
    for (let index = 1; index < Math.min(cells.length, 7); index++) {
      const { x, y } = this.center(cells[index]);
      const wobble = Math.sin(time / 50 + index) * 2;
      const progress = index / 7;
      const alpha = Math.max(0.1, 0.55 - progress * 0.08);
      const size = this.cellPx * (0.5 - progress * 0.05);

      // Outer Flame Smoke
      g.fillStyle(0xf59e0b, alpha);
      g.fillCircle(x + wobble, y + wobble, size);

      // Inner Core Flame
      g.fillStyle(0xfff07d, alpha * 0.85);
      g.fillCircle(x, y, size * 0.55);
    }
  }
}
