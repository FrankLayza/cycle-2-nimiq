import { Room } from 'colyseus';
import type { Client } from 'colyseus';
import { SIM_VERSION, TICK_MS, botPolicy, createRun, isTerminal, step, winnerOf } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import { isValidCode } from './codes.js';
import { CellState, MatchState, PelletState, SnakeState } from './schema.js';

const DEFAULT_INPUT: AppliedInput = { turn: null, boost: false };
const FORFEIT_INPUT: AppliedInput = { turn: null, boost: false, forfeit: true };
const SEAT_COUNT = 4;
const MIN_PLAYERS_TO_START = 2;
const COUNTDOWN_SECONDS = 3;
const RECONNECTION_SECONDS = 8;

// The deployment architecture is deliberately single-process because SQLite is
// local. This prevents joinOrCreate() from splitting one code across multiple
// locked/full room instances in that process.
const activePvpCodes = new Map<string, string>();

interface RoomOptions {
  mode?: string;
  code?: string;
  seed?: number;
  maxPlayers?: number;
}

interface JoinOptions {
  wallet?: string;
}

interface ClientMessage {
  turn?: unknown;
  boost?: unknown;
}

function parseTurn(value: unknown): Dir | null | undefined {
  if (value === undefined || value === null) return null;
  if (value === 'up' || value === 'down' || value === 'left' || value === 'right') return value;
  return undefined;
}

/**
 * Authoritative match room (architecture section 4).
 * The server runs the shared sim; clients send `input` messages that are
 * applied on the next tick and appended to the authoritative input log (D27).
 * Bots only ever appear in free-play `bot` mode (D5).
 */
export class MatchRoom extends Room<MatchState> {
  maxClients = SEAT_COUNT;

  /** Applied inputs per tick, per seat - the verification payload. */
  inputLog: AppliedInput[][] = [];

  private mode: 'bot' | 'pvp' = 'bot';
  private code: string | null = null;
  private maxSeats = SEAT_COUNT;
  private seed = 0;
  private sim: GameState | null = null;
  private pending: (AppliedInput | null)[] = [];
  private last: AppliedInput[] = [];
  private seatOf = new Map<string, number>();
  private botSeat: number | null = null;
  private countdownTimer: { clear(): void } | null = null;
  private countdownLeft = 0;
  private playerCount = 0;
  private reconnectingSeats = new Set<number>();
  private pendingForfeits = new Set<number>();
  private forfeitedSeats = new Set<number>();
  private rematchVotes = new Set<string>();

  onCreate(options: RoomOptions = {}) {
    this.mode = options.mode === 'pvp' ? 'pvp' : 'bot';
    const requestedSeats = Number(options.maxPlayers ?? SEAT_COUNT);
    this.maxSeats = this.mode === 'pvp' && Number.isInteger(requestedSeats)
      ? Math.min(SEAT_COUNT, Math.max(MIN_PLAYERS_TO_START, requestedSeats))
      : this.mode === 'pvp' ? SEAT_COUNT : 2;
    this.maxClients = this.mode === 'pvp' ? this.maxSeats : 1;
    this.patchRate = TICK_MS;
    this.seed = options.seed ?? ((Math.random() * 0xffffffff) >>> 0);

    if (this.mode === 'pvp') {
      const code = options.code?.trim();
      if (!code || code !== code.toUpperCase() || !isValidCode(code)) {
        throw new Error('PvP rooms require a canonical room code');
      }
      if (activePvpCodes.has(code)) {
        throw new Error(`PvP room code ${code} is already active`);
      }
      this.code = code;
      this.roomId = code;
      activePvpCodes.set(code, this.roomId);
    }

    this.setState(new MatchState());
    this.state.roomId = this.roomId;
    this.state.mode = this.mode;
    this.state.seed = this.seed;
    this.state.simVersion = SIM_VERSION;
    this.state.nextShrinkTick = 100; // SHRINK_EVERY

    this.onMessage('input', (client, message: ClientMessage | null) => {
      const seat = this.seatOf.get(client.sessionId);
      if (seat === undefined || this.state.status !== 'playing' || !message || typeof message !== 'object') return;
      const turn = parseTurn(message.turn);
      if (turn === undefined) return;
      this.pending[seat] = { turn, boost: message.boost === true };
    });
    this.onMessage('rematch', (client) => {
      this.requestRematch(client);
    });

    this.setSimulationInterval(() => this.tick(), TICK_MS);
  }

  onAuth() {
    if (this.state.status !== 'lobby' && this.state.status !== 'countdown') return false;
    if (this.mode === 'bot') return this.seatOf.size === 0;
    return this.freeSeat() !== null;
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    if (this.state.status !== 'lobby' && this.state.status !== 'countdown') {
      throw new Error('Match already started');
    }
    const seat = this.freeSeat();
    if (seat === null) throw new Error('Match is full');

    this.seatOf.set(client.sessionId, seat);
    this.addSnake(seat, options.wallet ?? 'anon', false, client.sessionId);
    // Bots only in free-play (D5): fill seat 1 as soon as the first human arrives.
    if (this.mode === 'bot' && this.botSeat === null) {
      this.botSeat = 1;
      this.addSnake(1, 'BOT', true, 'bot');
    }
    this.maybeStart();
  }

  async onLeave(client: Client, consented: boolean) {
    const seat = this.seatOf.get(client.sessionId);
    if (seat === undefined) return;

    if (this.state.status === 'playing') {
      const snake = this.sim?.snakes[seat];
      if (!snake?.alive) {
        this.releaseSeat(client.sessionId, seat, false);
        return;
      }

      this.pending[seat] = DEFAULT_INPUT;
      this.last[seat] = DEFAULT_INPUT;
      if (consented) {
        this.forfeit(client.sessionId, seat);
        return;
      }

      this.reconnectingSeats.add(seat);
      try {
        const reconnected = await this.allowReconnection(client, RECONNECTION_SECONDS);
        this.reconnectingSeats.delete(seat);
        const schemaSnake = this.state.snakes.get(String(seat));
        if (schemaSnake) schemaSnake.sessionId = reconnected.sessionId;
      } catch {
        this.reconnectingSeats.delete(seat);
        this.forfeit(client.sessionId, seat);
      }
      return;
    }

    this.releaseSeat(client.sessionId, seat, true);
    this.rematchVotes.delete(client.sessionId);
    if (this.state.status === 'countdown' && !this.hasEnoughPlayers()) this.cancelCountdown();
    if (this.state.status === 'finished') this.maybeBeginRematch();
  }

  onDispose() {
    this.countdownTimer?.clear();
    if (this.code && activePvpCodes.get(this.code) === this.roomId) activePvpCodes.delete(this.code);
  }

  // ---- internals ----

  private hasEnoughPlayers(): boolean {
    return this.mode === 'bot' ? this.seatOf.size >= 1 : this.seatOf.size >= MIN_PLAYERS_TO_START;
  }

  private freeSeat(): number | null {
    for (let seat = 0; seat < this.maxSeats; seat++) {
      if (this.botSeat === seat) continue;
      let taken = false;
      this.seatOf.forEach((assignedSeat) => {
        if (assignedSeat === seat) taken = true;
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
    snake.color = this.colorForSeat(seat);
    this.state.snakes.set(String(seat), snake);
  }

  private colorForSeat(seat: number): string {
    return ['#ff6b6b', '#3ddc84', '#6b9cff', '#f0c75e'][seat] ?? '#ffffff';
  }

  private releaseSeat(sessionId: string, seat: number, removeSchema: boolean) {
    this.seatOf.delete(sessionId);
    this.reconnectingSeats.delete(seat);
    this.pendingForfeits.delete(seat);
    if (removeSchema) this.state.snakes.delete(String(seat));
    if (this.botSeat === seat) this.botSeat = null;
  }

  private maybeStart() {
    if (this.hasEnoughPlayers()) this.startCountdown();
  }

  private startCountdown() {
    if (this.state.status !== 'lobby') return;
    this.state.status = 'countdown';
    this.countdownLeft = COUNTDOWN_SECONDS;
    this.state.countdown = this.countdownLeft;
    this.countdownTimer = this.clock.setInterval(() => {
      this.countdownLeft--;
      this.state.countdown = this.countdownLeft;
      if (this.countdownLeft <= 0) {
        this.countdownTimer?.clear();
        this.countdownTimer = null;
        if (!this.hasEnoughPlayers()) {
          this.cancelCountdown();
          return;
        }
        this.startPlaying();
      }
    }, 1000);
  }

  private cancelCountdown() {
    this.countdownTimer?.clear();
    this.countdownTimer = null;
    this.countdownLeft = 0;
    this.state.countdown = 0;
    this.state.status = 'lobby';
  }

  private compactHumanSeats() {
    if (this.mode !== 'pvp') return;
    const players = [...this.seatOf.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([sessionId, oldSeat]) => ({ sessionId, snake: this.state.snakes.get(String(oldSeat)) }));

    this.seatOf.clear();
    this.state.snakes.clear();
    players.forEach(({ sessionId, snake }, seat) => {
      this.seatOf.set(sessionId, seat);
      if (snake) {
        snake.seat = seat;
        snake.color = this.colorForSeat(seat);
        this.state.snakes.set(String(seat), snake);
      }
    });
  }

  private startPlaying() {
    this.compactHumanSeats();
    this.state.status = 'playing';
    this.state.countdown = 0;
    this.playerCount = this.mode === 'pvp' ? Math.min(this.maxSeats, this.seatOf.size) : 2;
    this.sim = createRun(this.seed, this.mode === 'pvp' ? 'pvp' : 'bot', SIM_VERSION, this.playerCount);
    this.inputLog = [];
    this.pending = Array.from({ length: this.playerCount }, () => null);
    this.last = Array.from({ length: this.playerCount }, () => DEFAULT_INPUT);
    this.reconnectingSeats.clear();
    this.pendingForfeits.clear();
    this.forfeitedSeats.clear();
    this.rematchVotes.clear();
    this.syncState();
    void this.lock();
  }

  private tick() {
    if (!this.sim || this.state.status !== 'playing' || this.reconnectingSeats.size > 0) return;
    const inputs: AppliedInput[] = [];
    for (let seat = 0; seat < this.playerCount; seat++) {
      const snake = this.sim.snakes[seat];
      if (!snake) {
        inputs.push(DEFAULT_INPUT);
        continue;
      }

      let applied: AppliedInput;
      if (this.pendingForfeits.delete(seat)) {
        applied = FORFEIT_INPUT;
      } else {
        applied = this.botSeat === seat ? botPolicy(this.sim, seat) : (this.pending[seat] ?? this.last[seat]);
      }
      inputs.push(applied);
      this.last[seat] = applied;
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
      const schemaSnake = this.state.snakes.get(String(sn.id));
      if (!schemaSnake) continue;
      schemaSnake.score = sn.score;
      schemaSnake.length = sn.cells.length;
      schemaSnake.alive = sn.alive;
      schemaSnake.boosting = sn.boost;
      while (schemaSnake.cells.length > sn.cells.length) schemaSnake.cells.pop();
      for (let index = 0; index < sn.cells.length; index++) {
        const cell = sn.cells[index];
        let schemaCell = schemaSnake.cells[index];
        if (!schemaCell) {
          schemaCell = new CellState();
          schemaSnake.cells.push(schemaCell);
        }
        schemaCell.x = cell.x;
        schemaCell.y = cell.y;
      }
    }

    while (this.state.pellets.length > this.sim.pellets.length) this.state.pellets.pop();
    for (let index = 0; index < this.sim.pellets.length; index++) {
      const pellet = this.sim.pellets[index];
      let schemaPellet = this.state.pellets[index];
      if (!schemaPellet) {
        schemaPellet = new PelletState();
        this.state.pellets.push(schemaPellet);
      }
      schemaPellet.x = pellet.x;
      schemaPellet.y = pellet.y;
      schemaPellet.type = pellet.type;
    }
  }

  private forfeit(sessionId: string, seat: number) {
    this.seatOf.delete(sessionId);
    this.reconnectingSeats.delete(seat);
    this.pending[seat] = DEFAULT_INPUT;
    this.last[seat] = DEFAULT_INPUT;
    this.pendingForfeits.add(seat);
    this.forfeitedSeats.add(seat);
  }

  private finish() {
    this.state.status = 'finished';
    if (this.sim) {
      this.state.resultJson = JSON.stringify({
        mode: this.sim.mode,
        seed: this.sim.seed,
        version: this.sim.version,
        ticks: this.sim.tick,
        winner: winnerOf(this.sim),
        forfeited: [...this.forfeitedSeats].sort((a, b) => a - b),
        snakes: this.sim.snakes.map((sn) => ({ id: sn.id, score: sn.score, length: sn.cells.length, alive: sn.alive })),
      });
    }
    this.broadcast('matchEnd', { result: this.state.resultJson });
  }

  private requestRematch(client: Client) {
    if (this.state.status !== 'finished' || !this.seatOf.has(client.sessionId)) return;
    this.rematchVotes.add(client.sessionId);
    this.maybeBeginRematch();
  }

  private maybeBeginRematch() {
    if (this.state.status !== 'finished' || !this.hasEnoughPlayers()) return;
    const allPlayersConfirmed = [...this.seatOf.keys()].every((sessionId) => this.rematchVotes.has(sessionId));
    if (!allPlayersConfirmed) return;

    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.state.seed = this.seed;
    this.sim = null;
    this.inputLog = [];
    this.pending = [];
    this.last = [];
    this.state.status = 'lobby';
    this.state.resultJson = '';
    this.state.tick = 0;
    this.state.boundary = 30;
    this.startCountdown();
  }
}
