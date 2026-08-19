import { GRID_SIZE } from '@snake/sim';
import type { GameState } from '@snake/sim';
import type { ClientMatchState, ClientSnake } from '../net/client';

export interface RenderCell {
  x: number;
  y: number;
}

export interface RenderSnake {
  id: number;
  sessionId: string;
  wallet: string;
  alive: boolean;
  boosting: boolean;
  score: number;
  length: number;
  color: string;
  cells: RenderCell[];
}

export interface RenderPellet {
  x: number;
  y: number;
  type: number;
}

export interface RenderSnapshot {
  tick: number;
  seed: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  status: string;
  countdown: number;
  snakes: RenderSnake[];
  pellets: RenderPellet[];
}

function copyCells(cells: Iterable<{ x: number; y: number }>): RenderCell[] {
  return Array.from(cells, (cell) => ({ x: cell.x, y: cell.y }));
}

function snapshotSnake(id: number, snake: ClientSnake): RenderSnake {
  return {
    id,
    sessionId: snake.sessionId,
    wallet: snake.wallet,
    alive: snake.alive,
    boosting: snake.boosting,
    score: snake.score,
    length: snake.length,
    color: snake.color,
    cells: copyCells(snake.cells),
  };
}

export function snapshotFromRoom(state: ClientMatchState): RenderSnapshot {
  const inset = Math.floor((GRID_SIZE - state.boundary) / 2);
  return {
    tick: state.tick,
    seed: state.seed,
    bounds: {
      x0: inset,
      y0: inset,
      x1: inset + state.boundary - 1,
      y1: inset + state.boundary - 1,
    },
    status: state.status,
    countdown: state.countdown,
    snakes: Array.from(state.snakes.entries(), ([key, snake]) => snapshotSnake(Number(key), snake)),
    pellets: Array.from(state.pellets, (pellet) => ({ x: pellet.x, y: pellet.y, type: pellet.type })),
  };
}

export function snapshotFromGame(state: GameState): RenderSnapshot {
  return {
    tick: state.tick,
    seed: state.seed,
    bounds: { ...state.bounds },
    status: 'playing',
    countdown: 0,
    snakes: state.snakes.map((snake) => ({
      id: snake.id,
      sessionId: '',
      wallet: '',
      alive: snake.alive,
      boosting: snake.boost,
      score: snake.score,
      length: snake.cells.length,
      color: snake.id === 0 ? '#ff6b6b' : '#3ddc84',
      cells: copyCells(snake.cells),
    })),
    pellets: state.pellets.map((pellet) => ({ x: pellet.x, y: pellet.y, type: pellet.type })),
  };
}

export function interpolateSnapshots(previous: RenderSnapshot | null, current: RenderSnapshot, alpha: number): RenderSnapshot {
  if (!previous) return current;
  const t = Math.max(0, Math.min(1, alpha));
  const previousById = new Map(previous.snakes.map((snake) => [snake.id, snake]));
  return {
    ...current,
    snakes: current.snakes.map((snake) => {
      const old = previousById.get(snake.id);
      return {
        ...snake,
        cells: snake.cells.map((cell, index) => {
          const from = old?.cells[index];
          const source = from ?? cell;
          return { x: source.x + (cell.x - source.x) * t, y: source.y + (cell.y - source.y) * t };
        }),
      };
    }),
  };
}
