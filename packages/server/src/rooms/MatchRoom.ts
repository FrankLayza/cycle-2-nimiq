import { Room } from 'colyseus';
import type { Client } from 'colyseus';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, GameState } from '@snake/sim';
import { CellState, MatchState, PelletState, SnakeState } from './schema.js';

const DEFAULT_INPUT: AppliedInput = { turn: null, boost: false };
const SEAT_COUNT = 2;

interface RoomOptions {
  mode?: string;
  code?: string;
  seed?: number;
}

interface JoinOptions {
  wallet?: string;
}

interface ClientMessage {
  type?: string;
  turn?: string | null;
  boost?: boolean;
}

/**
 * Authoritative match room (architecture §4).
 * The server runs the shared sim; clients send `input` messages that are
 * applied on the next tick and appended to the authoritative input log (D27).
 * Bots only ever appear in free-play `bot` mode (D5).
 */
export class MatchRoom extends Room<MatchState> {
  maxClients = 4; // 2 seats + up to 2 spectators (W1)

  /** Applied inputs per tick, per seat — the verification payload. */
  inputLog: AppliedInput[][] = [];

  private mode: 'bot' | 'pvp' = 'bot';
  private seed = 0;
  private sim: GameState | null = null;
  private pending: (AppliedInput | null)[] = [null, null];
  private last: AppliedInput[] = [DEFAULT_INPUT, DEFAULT_INPUT];
  private seatOf = new Map<string, number>();
  private botSeat: number | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private countdownLeft = 0;

  onCreate(options: RoomOptions = {}) {
    this.mode = options.mode === 'pvp' ? 'pvp' : 'bot';
    this.seed = options.seed ?? ((Math.random() * 0xffffffff) >>> 0);
    this.setState(new MatchState());
    this.state.roomId = this.roomId;
    this.state.mode = this.mode;
    this.state.seed = this.seed;
    this.state.simVersion = SIM_VERSION;
    this.state.nextShrinkTick = 100; // SHRINK_EVERY

    // Incoming client messages (colyseus 0.16 registers handlers, no override).
    this.onMessage('input', (client, message: ClientMessage) => {
      const seat = this.seatOf.get(client.sessionId);
      if (seat === undefined) return;
      if (this.state.status !== 'playing') return;
      const turn = (message.turn as AppliedInput['turn']) ?? null;
      this.pending[seat] = { turn, boost: Boolean(message.boost) };
    });
    this.onMessage('rematch', () => {
      this.requestRematch();
    });
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const seat = this.freeSeat();
    if (seat === null) return; // spectator — state still syncs
    this.seatOf.set(client.sessionId, seat);
    this.addSnake(seat, options.wallet ?? 'anon', false, client.sessionId);
    // Bots only in free-play (D5): fill seat 1 as soon as the first human arrives.
    if (this.mode === 'bot' && this.botSeat === null) {
      this.botSeat = 1;
      this.addSnake(1, 'BOT', true, 'bot');
    }
    this.maybeStart();
  }

  onLeave(client: Client) {
    const seat = this.seatOf.get(client.sessionId);
    if (seat === undefined) return;
    this.seatOf.delete(client.sessionId);
    this.state.snakes.delete(String(seat));
    if (this.botSeat === seat) this.botSeat = null;
  }

  onDispose() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  // ---- internals ----

  private freeSeat(): number | null {
    for (let seat = 0; seat < SEAT_COUNT; seat++) {
      if (this.botSeat === seat) continue;
      let taken = false;
      this.seatOf.forEach((s) => {
        if (s === seat) taken = true;
      });
      if (!taken) return seat;
    }
    return null;
  }

  private addSnake(seat: number, wallet: string, isBot: boolean, sessionId: string) {
    const snake = new SnakeState();
    snake.seat = seat;
    snake.sessionId = sessionId;
    snake.wallet = wallet;
    snake.isBot = isBot;
    snake.color = seat === 0 ? '#ff6b6b' : '#3ddc84';
    this.state.snakes.set(String(seat), snake);
  }

  private maybeStart() {
    const humans = this.seatOf.size;
    if (this.mode === 'bot' ? humans >= 1 : humans >= 2) this.startCountdown();
  }

  private startCountdown() {
    if (this.state.status !== 'lobby') return;
    this.state.status = 'countdown';
    this.countdownLeft = 3;
    this.state.countdown = this.countdownLeft;
    this.countdownTimer = setInterval(() => {
      this.countdownLeft--;
      this.state.countdown = this.countdownLeft;
      if (this.countdownLeft <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.startPlaying();
      }
    }, 1000);
  }

  private startPlaying() {
    this.state.status = 'playing';
    this.sim = createRun(this.seed, this.mode === 'pvp' ? 'pvp' : 'bot', SIM_VERSION);
    this.inputLog = [];
    this.pending = [null, null];
    this.last = [DEFAULT_INPUT, DEFAULT_INPUT];
    this.syncState();
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    if (!this.sim || this.state.status !== 'playing') return;
    const inputs: AppliedInput[] = [];
    for (let seat = 0; seat < SEAT_COUNT; seat++) {
      const snake = this.sim.snakes[seat];
      if (!snake) {
        inputs.push(DEFAULT_INPUT);
        continue;
      }
      const a =
        this.botSeat === seat ? botPolicy(this.sim, seat) : (this.pending[seat] ?? this.last[seat]);
      inputs.push(a);
      this.pending[seat] = null;
    }
    this.inputLog.push(inputs);
    this.sim = step(this.sim, inputs);
    this.state.tick = this.sim.tick;
    this.state.boundary = this.sim.bounds.x1 - this.sim.bounds.x0 + 1;
    this.syncState();
    if (isTerminal(this.sim)) this.finish();
  }

  private syncState() {
    if (!this.sim) return;
    for (const sn of this.sim.snakes) {
      const s = this.state.snakes.get(String(sn.id));
      if (!s) continue;
      s.score = sn.score;
      s.length = sn.cells.length;
      s.alive = sn.alive;
      s.boosting = sn.boost;
      s.cells.clear();
      for (const c of sn.cells) {
        s.cells.push(Object.assign(new CellState(), { x: c.x, y: c.y }));
      }
    }
    this.state.pellets.clear();
    for (const p of this.sim.pellets) {
      this.state.pellets.push(Object.assign(new PelletState(), { x: p.x, y: p.y, type: p.type }));
    }
  }

  private finish() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.state.status = 'finished';
    if (this.sim) {
      this.state.resultJson = JSON.stringify({
        mode: this.sim.mode,
        seed: this.sim.seed,
        version: this.sim.version,
        ticks: this.sim.tick,
        winner: winnerOf(this.sim),
        snakes: this.sim.snakes.map((sn) => ({ id: sn.id, score: sn.score, length: sn.cells.length, alive: sn.alive })),
      });
    }
    this.broadcast('matchEnd', { result: this.state.resultJson });
  }

  private requestRematch() {
    if (this.state.status !== 'finished') return;
    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.state.seed = this.seed;
    this.sim = null;
    this.inputLog = [];
    this.pending = [null, null];
    this.last = [DEFAULT_INPUT, DEFAULT_INPUT];
    this.state.status = 'lobby';
    this.state.resultJson = '';
    this.state.tick = 0;
    this.state.boundary = 30;
    this.startCountdown();
  }
}
