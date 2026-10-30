import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fromJson, moveKey, snapshot, toJson } from '../../src/engine';

function fixture(name: string): string {
  const text = readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');
  // The serializer writes LF; a Windows checkout may hand us CRLF.
  return text.replace(/\r\n/g, '\n');
}

describe('save format parity with the desktop client', () => {
  it('loads a real desktop save and re-serialises it byte-identically', () => {
    const json = fixture('save-midgame.json');

    const game = fromJson(json);

    expect(snapshot(game)).toEqual(JSON.parse(json));
    expect(toJson(game)).toBe(json);
  });

  it('restores the board of a real desktop save', () => {
    const game = fromJson(fixture('save-midgame.json'));

    expect(game.playerIndex).toBe(0);
    expect(game.turnNumber).toBe(61);
    expect(game.remainingDice).toEqual([5, 6]);
    expect(game.board.pawnState(0, 0)).toBe('HOMER');
    expect(game.board.position.cellOf(0, 1)).toBe(13);
    expect(game.board.position.hasMoved(0, 1)).toBe(true);
    expect(game.board.position.cellOf(1, 0)).toBe(-1);
  });

  it('restores a finished desktop game as over, with its winner', () => {
    const json = fixture('save-finished.json');
    const game = fromJson(json);

    expect(game.gameOver).toBe(true);
    expect(game.result).toBe('won');
    expect(game.winnerPlayerIndex).toBe(0);
    expect(game.board.pawnState(0, 3)).toBe('FIELDER');
    expect(game.board.position.cellOf(0, 3)).toBe(0);
    expect(game.legalMoves()).toEqual([]);
    expect(game.rollDice()).toEqual([{ type: 'moveRejected', reason: 'game is over' }]);
    expect(toJson(game)).toBe(json);
  });

  it('a restored game keeps playing through the same apply path', () => {
    const game = fromJson(fixture('save-midgame.json'));
    const legal = game.legalMoves();

    expect(legal.length).toBeGreaterThan(0);
    const events = game.apply(legal[0]);

    expect(events.some((event) => event.type === 'moveRejected')).toBe(false);
    expect(new Set(legal.map(moveKey)).size).toBe(legal.length);
  });
});
