import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/GameConfig';
import { Board } from '../src/engine/Board';
import { Pawn, PawnState } from '../src/engine/Pawn';
import type { Player } from '../src/engine/Player';

describe('Pawn', () => {
  let board: Board;
  let player: Player;

  beforeEach(() => {
    board = new Board(DEFAULT_CONFIG);
    player = board.players[0];
  });

  it('starts on bench', () => {
    const pawn = player.pawns[0];
    expect(pawn.state).toBe(PawnState.BENCH);
    expect(pawn.cell).toBeNull();
  });

  it('can be placed on corner', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    corner.pawn = pawn;
    pawn.cell = corner;
    pawn.state = PawnState.NEWBORN;

    expect(pawn.state).toBe(PawnState.NEWBORN);
    expect(pawn.cell).toBe(corner);
  });

  it('moveTo field transitions to fielder', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    const fieldCell = corner.nextFieldCell!;

    pawn.cell = corner;
    pawn.state = PawnState.NEWBORN;
    corner.pawn = pawn;

    pawn.moveTo(fieldCell);

    expect(pawn.state).toBe(PawnState.FIELDER);
    expect(pawn.cell).toBe(fieldCell);
    expect(corner.pawn).toBeNull();
    expect(fieldCell.pawn).toBe(pawn);
  });

  it('moveTo home transitions to homer', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    const homeCell = corner.nextHomeCell!;

    pawn.cell = corner;
    pawn.state = PawnState.FIELDER;
    corner.pawn = pawn;

    pawn.moveTo(homeCell);

    expect(pawn.state).toBe(PawnState.HOMER);
    expect(pawn.cell).toBe(homeCell);
  });

  it('remove kicks pawn back to bench', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    pawn.cell = corner;
    pawn.state = PawnState.NEWBORN;
    corner.pawn = pawn;

    pawn.remove();

    expect(pawn.state).toBe(PawnState.BENCH);
    expect(pawn.cell).toBeNull();
    expect(corner.pawn).toBeNull();
  });

  it('remove throws for homer', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    const homeCell = corner.nextHomeCell!;
    pawn.cell = homeCell;
    pawn.state = PawnState.HOMER;
    homeCell.pawn = pawn;

    expect(() => pawn.remove()).toThrow('Cannot remove pawn in home');
  });

  it('remove throws for bench', () => {
    const pawn = player.pawns[0];
    expect(() => pawn.remove()).toThrow('Pawn already on bench');
  });

  it('findTargetCell field move', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    const fieldCell = corner.nextFieldCell!;
    pawn.cell = fieldCell;
    pawn.state = PawnState.FIELDER;
    fieldCell.pawn = pawn;

    const target = pawn.findTargetCell(1, DEFAULT_CONFIG);
    expect(target).not.toBeNull();
    expect(target).toBe(fieldCell.nextFieldCell);
  });

  it('findTargetCell blocked by friendly pawn', () => {
    const pawn1 = player.pawns[0];
    const pawn2 = player.pawns[1];
    const corner = board.getCorner(player);
    const cell1 = corner.nextFieldCell!;
    const cell2 = cell1.nextFieldCell!;

    pawn1.cell = cell1;
    pawn1.state = PawnState.FIELDER;
    cell1.pawn = pawn1;

    pawn2.cell = cell2;
    pawn2.state = PawnState.FIELDER;
    cell2.pawn = pawn2;

    const target = pawn1.findTargetCell(2, DEFAULT_CONFIG);
    expect(target).toBeNull();
  });

  it('findTargetCell can land on enemy', () => {
    const player2 = board.players[1];
    const myPawn = player.pawns[0];
    const enemyPawn = player2.pawns[0];

    const corner = board.getCorner(player);
    const targetCell = corner.nextFieldCell!.nextFieldCell;

    myPawn.cell = corner.nextFieldCell;
    myPawn.state = PawnState.FIELDER;
    corner.nextFieldCell!.pawn = myPawn;

    enemyPawn.cell = targetCell;
    enemyPawn.state = PawnState.FIELDER;
    targetCell!.pawn = enemyPawn;

    const target = myPawn.findTargetCell(1, DEFAULT_CONFIG);
    expect(target).not.toBeNull();
    expect(target).toBe(targetCell);
  });

  it('findTargetCell newborn moves on field', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    pawn.cell = corner;
    pawn.state = PawnState.NEWBORN;
    corner.pawn = pawn;

    const target = pawn.findTargetCell(1, DEFAULT_CONFIG);
    expect(target).not.toBeNull();
    expect(target).toBe(corner.nextFieldCell);
  });

  it('findTargetCell newborn does not enter home', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    pawn.cell = corner;
    pawn.state = PawnState.NEWBORN;
    corner.pawn = pawn;

    const target = pawn.findTargetCell(1, DEFAULT_CONFIG);
    expect(target).not.toBeNull();
    expect(target!.cellType).not.toBe('HOME');
  });

  it('findTargetCell homer moves in home', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    const homeCell = corner.nextHomeCell!;
    pawn.cell = homeCell;
    pawn.state = PawnState.HOMER;
    homeCell.pawn = pawn;

    const target = pawn.findTargetCell(1, DEFAULT_CONFIG);
    expect(target).not.toBeNull();
    expect(target).toBe(homeCell.nextHomeCell);
  });

  it('findTargetCell overshoot home returns null', () => {
    const pawn = player.pawns[0];
    const corner = board.getCorner(player);
    let lastHome = corner.nextHomeCell!;
    while (lastHome.nextHomeCell !== null) {
      lastHome = lastHome.nextHomeCell;
    }
    pawn.cell = lastHome;
    pawn.state = PawnState.HOMER;
    lastHome.pawn = pawn;

    const target = pawn.findTargetCell(1, DEFAULT_CONFIG);
    expect(target).toBeNull();
  });

  it('lastLapPawn wins with exact steps', () => {
    for (let i = 1; i < player.pawns.length; i++) {
      const p = player.pawns[i];
      let home = board.getCorner(player).nextHomeCell!;
      for (let j = 0; j < i && home.nextHomeCell !== null; j++) {
        home = home.nextHomeCell;
      }
      p.cell = home;
      p.state = PawnState.HOMER;
      home.pawn = p;
    }

    const lastPawn = player.pawns[0];
    const ownCorner = board.getCorner(player);

    let pos = ownCorner;
    for (let i = 0; i < 21; i++) {
      pos = pos.nextFieldCell!;
    }
    lastPawn.cell = pos;
    lastPawn.state = PawnState.FIELDER;
    pos.pawn = lastPawn;

    const target7 = lastPawn.findTargetCell(7, DEFAULT_CONFIG);
    expect(target7).toBe(ownCorner);

    const target8 = lastPawn.findTargetCell(8, DEFAULT_CONFIG);
    expect(target8).toBeNull();

    const target6 = lastPawn.findTargetCell(6, DEFAULT_CONFIG);
    expect(target6).not.toBeNull();
    expect(target6).not.toBe(ownCorner);
  });
});
