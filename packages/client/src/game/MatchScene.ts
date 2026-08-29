import Phaser from 'phaser';
import { GRID_SIZE, TICK_MS } from '@snake/sim';
import { interpolateSnapshots } from './renderState';
import type { RenderCell, RenderSnapshot } from './renderState';
import {
  FIELD,
  LIGHT,
  PALETTE,
  PELLET,
  REFERENCE_CELL_PX,
  shadowOffset,
  skinFor,
  specularOffset,
} from './theme';
import {
  TURF_SHEET_URL,
  TURF_TEXTURE_KEY,
  TURF_TILE_PX,
  buildTurfLayout,
} from './turf';

/** Render order. Turf tiles are re-added on every field rebuild, so depth is explicit. */
const DEPTH = {
  turf: -20,
  field: -10,
  actors: 0,
} as const;

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: number;
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
  private turf!: Phaser.GameObjects.Group;
  private field!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Graphics;
  private ready = false;
  private previous: RenderSnapshot | null = null;
  private current: RenderSnapshot | null = null;
  private currentReceivedAt = 0;
  private decoratedSeed: number | null = null;
  private particles: ParticleFX[] = [];
  private scorePopups: FloatingPopup[] = [];
  private previousBounds: RenderSnapshot['bounds'] | null = null;
  private boundaryFlashUntil = 0;

  /** Reused star geometry — rebuilding these every frame was pure GC churn. */
  private readonly starPoints: Phaser.Geom.Point[] = [];
  private readonly starShadowPoints: Phaser.Geom.Point[] = [];

  private cellPx = 720 / GRID_SIZE;
  private offX = 0;
  private offY = 0;
  private fieldSize = 720;

  constructor() {
    super('Match');
    for (let i = 0; i < 10; i++) {
      this.starPoints.push(new Phaser.Geom.Point(0, 0));
      this.starShadowPoints.push(new Phaser.Geom.Point(0, 0));
    }
  }

  /**
   * Scale factor for detail geometry that was hand-tuned against a 24px cell.
   * The canvas now renders in device pixels at any host size, so raw pixel
   * constants must be converted or they detach from the shape they belong to —
   * which is exactly how the pellet stem and leaf used to drift off the pellet.
   */
  private get unit(): number {
    return this.cellPx / REFERENCE_CELL_PX;
  }

  preload() {
    this.load.spritesheet(TURF_TEXTURE_KEY, TURF_SHEET_URL, {
      frameWidth: TURF_TILE_PX,
      frameHeight: TURF_TILE_PX,
    });
  }

  create() {
    this.updateDimensions();
    this.cameras.main.setBackgroundColor(FIELD.backdrop);
    // Explicit depths: tiles are added to the display list after the Graphics
    // layers on every field rebuild, so insertion order cannot be relied on.
    this.turf = this.add.group();
    this.field = this.add.graphics().setDepth(DEPTH.field);
    this.actors = this.add.graphics().setDepth(DEPTH.actors);
    this.ready = true;

    this.scale.on('resize', () => {
      this.updateDimensions();
      if (this.decoratedSeed !== null) this.drawField(this.decoratedSeed);
    });

    // A snapshot can arrive before the sheet finishes loading, so paint whatever
    // is already buffered now that the scene is live.
    if (this.current) this.drawField(this.current.seed);
  }

  private updateDimensions() {
    const width = this.scale.width;
    const height = this.scale.height;
    /*
     * Integer cell size, so every cell boundary lands on a whole device pixel and
     * the tiled turf has no seams or drift.
     *
     * A small margin is reserved first: at an exact fit the field ran flush to the
     * canvas edge, which clipped the dashed boundary marker and any pellet sitting
     * in an outer cell.
     *
     * The tile interior still scales fractionally, which is unavoidable: 30 cells
     * at the sheet's native 16px need 480px, and a phone in landscape is often
     * shorter than that, so an integer *tile* scale would not fit at all — and
     * where it did fit it would waste up to a third of the viewport. Fractional
     * scaling of a ground texture is not noticeable; revisit if the snakes become
     * sprites, which would want a low-resolution canvas upscaled as one image.
     */
    const shortest = Math.min(width, height);
    const margin = Math.round(shortest * 0.022);
    this.cellPx = Math.max(1, Math.floor((shortest - margin * 2) / GRID_SIZE));
    this.fieldSize = this.cellPx * GRID_SIZE;
    this.offX = Math.floor((width - this.fieldSize) / 2);
    this.offY = Math.floor((height - this.fieldSize) / 2);
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
    if (!this.ready) return;
    if (this.previous) this.spawnPelletFx(this.previous, snapshot, timestamp);
    if (this.decoratedSeed !== snapshot.seed) this.drawField(snapshot.seed);
  }

  /**
   * Spawn pickup FX by diffing two consecutive authoritative snapshots.
   *
   * This runs once per tick against raw integer cells, rather than every frame
   * against interpolated ones, and it distinguishes a pellet that was *eaten*
   * from one that merely expired. The sim drops a bounty once it passes
   * `BOUNTY_MAX_AGE`, and the previous frame-based diff treated any disappearance
   * as a pickup — so an uneaten bounty timing out threw a "+3" celebration that
   * nobody had scored.
   *
   * A pellet was eaten exactly when a snake head occupies its cell on the next
   * tick, because `step()` awards pellets at the head's final position.
   */
  private spawnPelletFx(previous: RenderSnapshot, next: RenderSnapshot, time: number) {
    if (previous.pellets.length === 0) return;
    const survived = new Set(next.pellets.map((p) => `${p.x}:${p.y}:${p.type}`));
    const heads = new Set(
      next.snakes
        .filter((snake) => snake.cells[0])
        .map((snake) => `${snake.cells[0].x}:${snake.cells[0].y}`)
    );
    const u = this.unit;

    for (const pellet of previous.pellets) {
      if (survived.has(`${pellet.x}:${pellet.y}:${pellet.type}`)) continue;

      const worldX = this.offX + (pellet.x + 0.5) * this.cellPx;
      const worldY = this.offY + (pellet.y + 0.5) * this.cellPx;
      const color = pellet.type === 1 ? PELLET.bounty : this.pelletColor();

      if (!heads.has(`${pellet.x}:${pellet.y}`)) {
        // Expired, not eaten: a small colourless puff so the pellet does not
        // simply blink out, but no score popup and no celebration.
        for (let index = 0; index < 5; index++) {
          const angle = (index * Math.PI * 2) / 5;
          this.particles.push({
            x: worldX,
            y: worldY,
            vx: Math.cos(angle) * 0.6 * u * REFERENCE_CELL_PX,
            vy: Math.sin(angle) * 0.6 * u * REFERENCE_CELL_PX,
            born: time,
            life: 320,
            color: FIELD.decorShadow,
            size: 2.2 * u,
          });
        }
        continue;
      }

      // Burst velocities are pre-scaled to pixels-per-life, so the burst covers
      // the same fraction of a cell at any canvas size.
      const count = pellet.type === 1 ? 12 : 8;
      for (let index = 0; index < count; index++) {
        const angle = (index * Math.PI * 2) / count + (Math.random() - 0.5) * 0.5;
        const speed = (1.2 + Math.random() * 2.2) * u * REFERENCE_CELL_PX;
        this.particles.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          born: time,
          life: 450,
          color,
          size: (3 + Math.random() * 2.5) * u,
        });
      }

      this.scorePopups.push({
        x: worldX,
        y: worldY - 6 * u,
        text: pellet.type === 1 ? '+3' : '+1',
        color,
        born: time,
      });
    }
  }

  update(time: number) {
    if (!this.current) return;
    const alpha = (time - this.currentReceivedAt) / TICK_MS;
    this.renderSnapshot(interpolateSnapshots(this.previous, this.current, alpha), time);
  }

  private drawField(seed: number) {
    this.decoratedSeed = seed;
    this.drawTurf(seed);

    const g = this.field;
    g.clear();

    /*
     * A hard-edged frame, aligned to the cell grid.
     *
     * What used to be here — a rounded stadium bevel, a chalk centre circle, and
     * 40 vector daisies — all fought the 16px tiles: smooth anti-aliased curves
     * over nearest-neighbour pixel art reads as two unrelated pieces of art. The
     * mow stripes went too: they were drawn one per gameplay column, which made
     * the 30x30 lattice the most prominent thing on the field. The tiles now
     * carry the texture, and their variant is seeded per cell so nothing lines up
     * with the grid.
     */
    const border = Math.max(2, Math.round(this.cellPx * 0.3));
    g.lineStyle(border, FIELD.rim, 1);
    g.strokeRect(
      this.offX - border / 2,
      this.offY - border / 2,
      this.fieldSize + border,
      this.fieldSize + border
    );
    g.lineStyle(Math.max(1, Math.round(border / 3)), FIELD.rimInner, 0.85);
    g.strokeRect(this.offX, this.offY, this.fieldSize, this.fieldSize);
  }

  /**
   * Stamp the turf tiles.
   *
   * All 900 images share one texture, so they batch into a single draw call, and
   * they are static — this runs once per seed (and on resize), never per frame.
   */
  private drawTurf(seed: number) {
    this.turf.clear(true, true);
    const layout = buildTurfLayout(seed, GRID_SIZE);
    const scale = this.cellPx / TURF_TILE_PX;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = this.add
          .image(
            this.offX + x * this.cellPx,
            this.offY + y * this.cellPx,
            TURF_TEXTURE_KEY,
            layout[y * GRID_SIZE + x]
          )
          .setOrigin(0, 0)
          .setScale(scale)
          .setDepth(DEPTH.turf);
        this.turf.add(tile);
      }
    }
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

    // 2. Render Floating Pellets. Pickup FX are spawned per tick in
    //    `spawnPelletFx`, not here — see the note there on eaten vs expired.
    for (const pellet of state.pellets) {
      const bobRange = this.cellPx * 0.1;
      const bob = Math.sin(time / 200 + pellet.x * 2 + pellet.y) * bobRange;
      const x = this.offX + (pellet.x + 0.5) * this.cellPx;
      const y = this.offY + (pellet.y + 0.5) * this.cellPx + bob;

      // Contact Ground Shadow (tightens as the pellet floats higher)
      const shadowScale = 1 - bob / (bobRange * 5);
      const shadow = shadowOffset(this.cellPx);
      g.fillStyle(LIGHT.groundShadow, 0.32);
      g.fillEllipse(
        x + shadow.x,
        this.offY + (pellet.y + 0.5) * this.cellPx + this.cellPx * 0.28,
        this.cellPx * 0.52 * shadowScale,
        this.cellPx * 0.2 * shadowScale
      );

      if (pellet.type === 1) this.drawStar(g, x, y, this.cellPx * 0.46, time);
      else this.drawApple(g, x, y);
    }

    // 4. Render Snakes
    for (const snake of state.snakes) {
      if (!snake.cells[0]) continue;

      // Colours derive from the seat skin, so any seat count and any
      // server-supplied colour renders correctly.
      const skin = skinFor(snake.id, snake.color);
      const shadow = shadowOffset(this.cellPx);

      g.setAlpha(snake.alive ? 1 : 0.4);

      // A. Dynamic Ground Shadows for all segments
      for (const cell of snake.cells) {
        const at = this.center(cell);
        g.fillStyle(LIGHT.groundShadow, snake.alive ? LIGHT.groundShadowAlpha : 0.1);
        g.fillEllipse(at.x + shadow.x, at.y + shadow.y * 3, this.cellPx * 0.82, this.cellPx * 0.26);
      }

      // B. Boost Exhaust FX
      if (snake.boosting && snake.alive) this.drawBoostTrail(g, snake.cells, time);

      // C. Continuous Segment Connectors & Body Pills
      for (let index = snake.cells.length - 1; index >= 1; index--) {
        const currentCell = snake.cells[index];
        const nextCell = snake.cells[index - 1];
        this.drawConnector(g, currentCell, nextCell, skin.shade, skin.base);
        this.drawSegment(g, currentCell, skin.base, skin.shade, skin.highlight, index, skin.pattern);
      }

      // D. Snake Head
      this.drawHead(g, snake.cells[0], snake.cells[1], skin.base, skin.shade, skin.highlight, snake.boosting);

      g.setAlpha(1);
    }

    // 5. Render Particle Bursts & Score Popups
    this.drawParticles(g, time);
    this.drawPopups(g, time);

    // 6. Arena Boundary Flash on Shrink
    if (time < this.boundaryFlashUntil) {
      const alpha = (this.boundaryFlashUntil - time) / 300;
      g.fillStyle(PALETTE.white, alpha * 0.22);
      g.fillRect(this.offX, this.offY, this.fieldSize, this.fieldSize);
    }
  }

  /** Normal-pellet accent. Kept separate so the pellet art can be re-themed in one place. */
  private pelletColor(): number {
    return skinFor(0).base;
  }

  private drawParticles(g: Phaser.GameObjects.Graphics, time: number) {
    const u = this.unit;
    this.particles = this.particles.filter((p) => time - p.born < p.life);
    for (const p of this.particles) {
      const progress = (time - p.born) / p.life;
      const alpha = Math.max(0, 1 - progress);
      const currentX = p.x + p.vx * progress;
      const currentY = p.y + p.vy * progress - progress * 10 * u;
      const currentSize = p.size * (1 - progress * 0.5);
      const spec = specularOffset(this.cellPx);

      g.fillStyle(p.color, alpha);
      g.fillCircle(currentX, currentY, currentSize);
      g.fillStyle(PALETTE.white, alpha * 0.7);
      g.fillCircle(currentX + spec.x * 0.22, currentY + spec.y * 0.22, currentSize * 0.45);
    }
  }

  private drawPopups(g: Phaser.GameObjects.Graphics, time: number) {
    const u = this.unit;
    this.scorePopups = this.scorePopups.filter((pop) => time - pop.born < 500);
    for (const pop of this.scorePopups) {
      const progress = (time - pop.born) / 500;
      const alpha = Math.max(0, 1 - progress);
      const y = pop.y - progress * 22 * u;
      const spec = specularOffset(this.cellPx);

      // Glowing expansion shockwave ring
      g.lineStyle(2 * u, pop.color, alpha * 0.8);
      g.strokeCircle(pop.x, pop.y, (5 + progress * 20) * u);

      // Sparkle drifting up
      g.fillStyle(pop.color, alpha);
      g.fillCircle(pop.x, y, 3.5 * u * (1 - progress * 0.4));
      g.fillStyle(PALETTE.white, alpha * 0.9);
      g.fillCircle(pop.x + spec.x * 0.22, y + spec.y * 0.22, 1.8 * u * (1 - progress * 0.4));
    }
  }

  private drawBoundary(g: Phaser.GameObjects.Graphics, state: RenderSnapshot) {
    const u = this.unit;
    const x = this.offX + state.bounds.x0 * this.cellPx;
    const y = this.offY + state.bounds.y0 * this.cellPx;
    const width = (state.bounds.x1 - state.bounds.x0 + 1) * this.cellPx;
    const height = (state.bounds.y1 - state.bounds.y0 + 1) * this.cellPx;
    const urgency = Math.max(0, 1 - (state.bounds.x1 - state.bounds.x0 + 1) / GRID_SIZE);
    const shadow = shadowOffset(this.cellPx);

    // Forbidden Zone Darkening (outside active playable grid)
    if (
      state.bounds.x0 > 0 ||
      state.bounds.x1 < GRID_SIZE - 1 ||
      state.bounds.y0 > 0 ||
      state.bounds.y1 < GRID_SIZE - 1
    ) {
      g.fillStyle(FIELD.forbidden, 0.45);
      if (y > this.offY) g.fillRect(this.offX, this.offY, this.fieldSize, y - this.offY);
      if (y + height < this.offY + this.fieldSize) {
        g.fillRect(this.offX, y + height, this.fieldSize, this.offY + this.fieldSize - (y + height));
      }
      if (x > this.offX) g.fillRect(this.offX, y, x - this.offX, height);
      if (x + width < this.offX + this.fieldSize) {
        g.fillRect(x + width, y, this.offX + this.fieldSize - (x + width), height);
      }
    }

    // Beveled Boundary Curb — outer drop shadow
    g.lineStyle(6 * u, FIELD.shadow, 0.4);
    g.strokeRect(x + shadow.x, y + shadow.y, width, height);

    // Main border
    const borderColor = urgency > 0.45 ? PALETTE.gold : PALETTE.white;
    g.lineStyle(4 * u, borderColor, 0.85 + urgency * 0.15);

    // Dashed stadium line
    const dash = 16 * u;
    const gap = 10 * u;
    for (let dx = 0; dx < width; dx += dash + gap) {
      g.lineBetween(x + dx, y, Math.min(x + dx + dash, x + width), y);
      g.lineBetween(x + dx, y + height, Math.min(x + dx + dash, x + width), y + height);
    }
    for (let dy = 0; dy < height; dy += dash + gap) {
      g.lineBetween(x, y + dy, x, Math.min(y + dy + dash, y + height));
      g.lineBetween(x + width, y + dy, x + width, Math.min(y + dy + dash, y + height));
    }

    // Corner Stadium Posts
    const postRadius = 4.5 * u;
    const corners = [
      { cx: x, cy: y },
      { cx: x + width, cy: y },
      { cx: x, cy: y + height },
      { cx: x + width, cy: y + height },
    ];
    const spec = specularOffset(this.cellPx);
    for (const c of corners) {
      g.fillStyle(PALETTE.ink, 0.5);
      g.fillCircle(c.cx + shadow.x, c.cy + shadow.y, postRadius);
      g.fillStyle(borderColor, 1);
      g.fillCircle(c.cx, c.cy, postRadius);
      g.fillStyle(PALETTE.white, 0.9);
      g.fillCircle(c.cx + spec.x * 0.3, c.cy + spec.y * 0.3, postRadius * 0.4);
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

    g.lineStyle(thickness + 4 * this.unit, outline, 1);
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
    index: number,
    pattern: number
  ) {
    const { x, y } = this.center(cell);
    const size = this.cellPx * 0.88;
    const bevel = 1.5 * this.unit;
    const spec = specularOffset(this.cellPx);

    // 1. Shaded bevel rim
    g.fillStyle(outline, 1);
    g.fillRoundedRect(x - size / 2 - bevel, y - size / 2 - bevel, size + bevel * 2, size + bevel * 2, size * 0.47);

    // 2. Main body
    g.fillStyle(base, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, size * 0.43);

    // 3. Specular gloss, positioned by the scene light
    g.fillStyle(PALETTE.white, 0.38);
    g.fillRoundedRect(
      x + spec.x - size * 0.24,
      y + spec.y - size * 0.26,
      size * 0.48,
      size * 0.22,
      size * 0.11
    );

    // 4. Dorsal marking. The variant is per seat so players stay distinguishable
    //    without relying on hue — coral/teal are the common red-green confusion pair.
    if (index % 2 !== 0) return;
    g.fillStyle(highlight, 0.45);
    switch (pattern % 4) {
      case 0:
        g.fillCircle(x, y - size * 0.08, size * 0.16);
        break;
      case 1:
        g.fillCircle(x - size * 0.17, y - size * 0.08, size * 0.1);
        g.fillCircle(x + size * 0.17, y - size * 0.08, size * 0.1);
        break;
      case 2:
        g.fillRect(x - size * 0.24, y - size * 0.14, size * 0.48, size * 0.12);
        break;
      default:
        g.lineStyle(size * 0.1, highlight, 0.45);
        g.strokeCircle(x, y - size * 0.06, size * 0.18);
        break;
    }
  }

  private drawHead(
    g: Phaser.GameObjects.Graphics,
    head: RenderCell,
    neck: RenderCell | undefined,
    base: number,
    outline: number,
    highlight: number,
    boosting: boolean
  ) {
    const { x, y } = this.center(head);
    const u = this.unit;
    const size = this.cellPx * 1.15;
    const dx = neck ? Math.sign(head.x - neck.x) : 1;
    const dy = neck ? Math.sign(head.y - neck.y) : 0;
    const spec = specularOffset(this.cellPx);

    // 1. Bevel base
    g.fillStyle(outline, 1);
    g.fillCircle(x, y, size * 0.54);

    // 2. Main head
    g.fillStyle(base, 1);
    g.fillCircle(x, y, size * 0.48);

    // 3. Gloss crescent, positioned by the scene light
    g.fillStyle(PALETTE.white, 0.32);
    g.fillEllipse(x + spec.x, y + spec.y, size * 0.44, size * 0.24);

    // 4. Directional Eyeballs & Pupils
    const sideX = dy * size * 0.22;
    const sideY = -dx * size * 0.22;
    const forwardX = dx * size * 0.18;
    const forwardY = dy * size * 0.18;
    const shadow = shadowOffset(this.cellPx);

    for (const side of [-1, 1]) {
      const eyeX = x + forwardX + sideX * side;
      const eyeY = y + forwardY + sideY * side;

      g.fillStyle(PALETTE.inkDeep, 0.25);
      g.fillCircle(eyeX + shadow.x * 0.5, eyeY + shadow.y * 0.5, size * 0.16);

      g.fillStyle(PALETTE.white, 1);
      g.fillCircle(eyeX, eyeY, size * 0.15);

      // Pupil looking in the direction of motion
      g.fillStyle(PALETTE.ink, 1);
      g.fillCircle(eyeX + dx * 2.2 * u, eyeY + dy * 2.2 * u, size * 0.075);

      g.fillStyle(PALETTE.white, 0.95);
      g.fillCircle(eyeX + dx * 2.8 * u + spec.x * 0.2, eyeY + dy * 2.8 * u + spec.y * 0.2, 1.6 * u);
    }

    // 5. Cheeks, tinted from the body highlight so every seat colour works
    g.fillStyle(highlight, 0.7);
    g.fillCircle(x - sideX * 1.5 - dx * 2 * u, y - sideY * 1.5 - dy * 2 * u, 2.8 * u);
    g.fillCircle(x + sideX * 1.5 - dx * 2 * u, y + sideY * 1.5 - dy * 2 * u, 2.8 * u);

    // 6. Boosting Flare
    if (boosting) {
      g.fillStyle(PALETTE.gold, 0.5);
      g.fillCircle(x + forwardX * 1.6, y + forwardY * 1.6, size * 0.22);
    }
  }

  private drawApple(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const u = this.unit;
    const spec = specularOffset(this.cellPx);
    const body = skinFor(0).base;

    // Body
    g.fillStyle(skinFor(0).shade, 1);
    g.fillCircle(x, y + 1.5 * u, this.cellPx * 0.32);
    g.fillStyle(body, 1);
    g.fillCircle(x + spec.x * 0.3, y + spec.y * 0.3, this.cellPx * 0.27);

    // Stem
    g.lineStyle(2.5 * u, 0x4a2c11, 1);
    g.lineBetween(x, y - 4 * u, x + 2 * u, y - 11 * u);

    // Leaf
    g.fillStyle(FIELD.clover, 1);
    g.fillEllipse(x + 5.5 * u, y - 9 * u, 8 * u, 4.5 * u);
    g.fillStyle(PALETTE.grassLight, 0.8);
    g.fillEllipse(x + 5.5 * u, y - 9.5 * u, 5 * u, 2.5 * u);

    // Specular Highlight
    g.fillStyle(PALETTE.white, 0.7);
    g.fillCircle(x + spec.x, y + spec.y, 2.8 * u);
  }

  private drawStar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    time: number
  ) {
    const u = this.unit;
    const shadow = shadowOffset(this.cellPx);
    const spec = specularOffset(this.cellPx);

    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.46;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const pointX = x + Math.cos(a) * r;
      const pointY = y + Math.sin(a) * r;
      this.starPoints[i].setTo(pointX, pointY);
      this.starShadowPoints[i].setTo(pointX + shadow.x, pointY + shadow.y);
    }

    // Beveled Backing
    g.fillStyle(PELLET.bountyShade, 1);
    g.fillPoints(this.starShadowPoints, true);

    // Main Golden Face
    g.fillStyle(PELLET.bounty, 1);
    g.fillPoints(this.starPoints, true);

    // Bright Top Facet
    g.fillStyle(PELLET.bountyFacet, 0.85);
    g.fillCircle(x + spec.x * 0.5, y + spec.y * 0.5, radius * 0.35);

    // Rotating Sparkle Glint
    const glintAngle = time / 350;
    const glintDist = radius * 0.75;
    g.fillStyle(PALETTE.white, 0.9);
    g.fillCircle(x + Math.cos(glintAngle) * glintDist, y + Math.sin(glintAngle) * glintDist, 2.2 * u);
  }

  private drawBoostTrail(g: Phaser.GameObjects.Graphics, cells: RenderCell[], time: number) {
    const u = this.unit;
    for (let index = 1; index < Math.min(cells.length, 7); index++) {
      const { x, y } = this.center(cells[index]);
      const wobble = Math.sin(time / 50 + index) * 2 * u;
      const progress = index / 7;
      const alpha = Math.max(0.1, 0.55 - progress * 0.08);
      const size = this.cellPx * (0.5 - progress * 0.05);

      // Outer Flame Smoke
      g.fillStyle(PALETTE.gold, alpha);
      g.fillCircle(x + wobble, y + wobble, size);

      // Inner Core Flame
      g.fillStyle(PALETTE.lemon, alpha * 0.85);
      g.fillCircle(x, y, size * 0.55);
    }
  }
}
