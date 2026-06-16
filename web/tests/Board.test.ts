import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/GameConfig';
import { Board } from '../src/engine/Board';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board(DEFAULT_CONFIG);
  });

  it('creates correct number of players', () => {
    expect(board.players.length).toBe(4);
  });

  it('each player has corner', () => {
    for (const player of board.players) {
      expect(board.getCorner(player)).toBeDefined();
    }
  });

  it('corners belong to correct players', () => {
    for (const player of board.players) {
      expect(board.getCorner(player).owner).toBe(player);
    }
  });

  it('field cells form ring', () => {
    const corner = board.getCorner(board.players[0]);
    let current = corner;
    let count = 0;
    do {
      current = current.nextFieldCell!;
      count++;
    } while (current !== corner);
    expect(count).toBe(28);
  });

  it('each player has home cells', () => {
    for (const player of board.players) {
      const corner = board.getCorner(player);
      let home = corner.nextHomeCell;
      let count = 0;
      while (home !== null) {
        count++;
        home = home.nextHomeCell;
      }
      expect(count).toBe(3);
    }
  });

  it('all cells are unique', () => {
    const cells = board.getAllCells();
    const unique = new Set(cells);
    expect(unique.size).toBe(cells.length);
  });
});
