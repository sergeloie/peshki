import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/GameConfig';
import { Board } from '../src/engine/Board';
import { PawnState } from '../src/engine/Pawn';
import type { Player } from '../src/engine/Player';

describe('Player', () => {
  let board: Board;
  let player: Player;

  beforeEach(() => {
    board = new Board(DEFAULT_CONFIG);
    player = board.players[0];
  });

  it('renumber all on bench keeps order', () => {
    player.renumber();
    for (let i = 0; i < 4; i++) {
      expect(player.pawns[i].number).toBe(i + 1);
    }
  });

  it('renumber fielder closer to finish gets lower number', () => {
    const corner = board.getCorner(player);
    const far = corner.nextFieldCell!;
    let near = far;
    for (let i = 0; i < 22; i++) {
      near = near.nextFieldCell!;
    }

    const pawnFar = player.pawns[0];
    pawnFar.cell = far;
    pawnFar.state = PawnState.FIELDER;
    far.pawn = pawnFar;

    const pawnNear = player.pawns[1];
    pawnNear.cell = near;
    pawnNear.state = PawnState.FIELDER;
    near.pawn = pawnNear;

    player.renumber();

    expect(pawnNear.number).toBe(1);
    expect(pawnFar.number).toBe(2);
  });

  it('renumber homer beats fielder', () => {
    const corner = board.getCorner(player);
    const fieldCell = corner.nextFieldCell!;
    const homeCell = corner.nextHomeCell!;

    const homer = player.pawns[0];
    homer.cell = homeCell;
    homer.state = PawnState.HOMER;
    homeCell.pawn = homer;

    const fielder = player.pawns[1];
    fielder.cell = fieldCell;
    fielder.state = PawnState.FIELDER;
    fieldCell.pawn = fielder;

    player.renumber();

    expect(homer.number).toBe(1);
    expect(fielder.number).toBe(2);
  });

  it('renumber homer further in home beats homer closer', () => {
    const corner = board.getCorner(player);
    const home1 = corner.nextHomeCell!;
    const home2 = home1.nextHomeCell!;

    const homer1 = player.pawns[0];
    homer1.cell = home1;
    homer1.state = PawnState.HOMER;
    home1.pawn = homer1;

    const homer2 = player.pawns[1];
    homer2.cell = home2;
    homer2.state = PawnState.HOMER;
    home2.pawn = homer2;

    player.renumber();

    expect(homer2.number).toBe(1);
    expect(homer1.number).toBe(2);
  });

  it('renumber newborn after fielder', () => {
    const corner = board.getCorner(player);
    const fieldCell = corner.nextFieldCell!;

    const fielder = player.pawns[0];
    fielder.cell = fieldCell;
    fielder.state = PawnState.FIELDER;
    fieldCell.pawn = fielder;

    const newborn = player.pawns[1];
    newborn.cell = corner;
    newborn.state = PawnState.NEWBORN;
    corner.pawn = newborn;

    player.renumber();

    expect(fielder.number).toBe(1);
    expect(newborn.number).toBe(2);
  });

  it('renumber after move updates numbers', () => {
    const corner = board.getCorner(player);
    const cell1 = corner.nextFieldCell!;
    const cell2 = cell1.nextFieldCell!;

    const pawn1 = player.pawns[0];
    pawn1.cell = cell1;
    pawn1.state = PawnState.FIELDER;
    cell1.pawn = pawn1;

    const pawn2 = player.pawns[1];
    pawn2.cell = cell2;
    pawn2.state = PawnState.FIELDER;
    cell2.pawn = pawn2;

    player.renumber();
    expect(pawn1.number).toBe(2);
    expect(pawn2.number).toBe(1);

    const cell3 = cell2.nextFieldCell!;
    pawn1.moveTo(cell3);
    cell3.pawn = pawn1;
    cell2.pawn = null;

    player.renumber();
    expect(pawn1.number).toBe(1);
    expect(pawn2.number).toBe(2);
  });
});
