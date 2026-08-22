import { describe, expect, it } from 'vitest';
import { interpolateSnapshots, snapshotFromRoom } from '../src/game/renderState';
import { ClientCell, ClientMatchState, ClientSnake } from '../src/net/client';

describe('PvP render snapshots', () => {
  it('interpolates authoritative cell positions and clamps alpha', () => {
    const previous = {
      tick: 1,
      seed: 7,
      bounds: { x0: 0, y0: 0, x1: 29, y1: 29 },
      status: 'playing',
      countdown: 0,
      snakes: [{ id: 0, sessionId: 'a', wallet: '', alive: true, boosting: false, score: 0, length: 1, color: '#ff6b6b', cells: [{ x: 1, y: 2 }] }],
      pellets: [],
    };
    const current = { ...previous, tick: 2, snakes: [{ ...previous.snakes[0], cells: [{ x: 3, y: 6 }] }] };

    expect(interpolateSnapshots(previous, current, 0.5).snakes[0].cells[0]).toEqual({ x: 2, y: 4 });
    expect(interpolateSnapshots(previous, current, -1).snakes[0].cells[0]).toEqual({ x: 1, y: 2 });
    expect(interpolateSnapshots(previous, current, 2).snakes[0].cells[0]).toEqual({ x: 3, y: 6 });
  });

  it('converts room state into centered render bounds and copied collections', () => {
    const state = new ClientMatchState();
    state.tick = 100;
    state.boundary = 28;
    const snake = new ClientSnake();
    snake.seat = 1;
    snake.sessionId = 'remote';
    snake.cells.push(Object.assign(new ClientCell(), { x: 4, y: 5 }));
    state.snakes.set('1', snake);

    const snapshot = snapshotFromRoom(state);
    expect(snapshot.bounds).toEqual({ x0: 1, y0: 1, x1: 28, y1: 28 });
    expect(snapshot.snakes[0].sessionId).toBe('remote');
    expect(snapshot.snakes[0].cells).toEqual([{ x: 4, y: 5 }]);
  });

  it('preserves eliminated snakes and their final cells for the result frame', () => {
    const state = new ClientMatchState();
    const snake = new ClientSnake();
    snake.seat = 0;
    snake.alive = false;
    snake.length = 2;
    snake.cells.push(Object.assign(new ClientCell(), { x: 8, y: 9 }));
    snake.cells.push(Object.assign(new ClientCell(), { x: 7, y: 9 }));
    state.snakes.set('0', snake);

    const snapshot = snapshotFromRoom(state);
    expect(snapshot.snakes[0]).toMatchObject({ alive: false, length: 2 });
    expect(snapshot.snakes[0].cells).toEqual([{ x: 8, y: 9 }, { x: 7, y: 9 }]);
  });
});
