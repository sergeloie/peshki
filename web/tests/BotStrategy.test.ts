import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/GameConfig';
import { Board } from '../src/engine/Board';
import { PawnState } from '../src/engine/Pawn';
import { GameEngine } from '../src/engine/GameEngine';
import { BotStrategy } from '../src/ai/BotStrategy';

describe('BotStrategy', () => {
  let board: Board;
  let strategy: BotStrategy;

  beforeEach(() => {
    board = new Board(DEFAULT_CONFIG);
    strategy = new BotStrategy();
  });

  it('selects best move from available', () => {
    const player = board.players[1];
    player.pawns[0].cell = board.getCorner(player).nextFieldCell;
    player.pawns[0].state = PawnState.FIELDER;
    board.getCorner(player).nextFieldCell!.pawn = player.pawns[0];

    const moves = GameEngine.generateAllMoves(player, [3, 4], board, DEFAULT_CONFIG);
    const best = strategy.selectBestMove(player, moves, DEFAULT_CONFIG);
    expect(best).not.toBeNull();
  });

  it('prefers killing move', () => {
    const player = board.players[0];
    const enemy = board.players[1];

    const myPawn = player.pawns[0];
    const cell = board.getCorner(player).nextFieldCell!;
    myPawn.cell = cell;
    myPawn.state = PawnState.FIELDER;
    cell.pawn = myPawn;

    const enemyPawn = enemy.pawns[0];
    const targetCell = cell.nextFieldCell!;
    enemyPawn.cell = targetCell;
    enemyPawn.state = PawnState.FIELDER;
    targetCell.pawn = enemyPawn;

    const moves = GameEngine.generateAllMoves(player, [1, 6], board, DEFAULT_CONFIG);
    const best = strategy.selectBestMove(player, moves, DEFAULT_CONFIG);
    expect(best).not.toBeNull();
    if (best && best.pawn) {
      expect(best.pawn).toBe(myPawn);
      expect(best.steps).toBe(1);
    }
  });

  it('returns null for empty moves', () => {
    const player = board.players[0];
    const best = strategy.selectBestMove(player, [], DEFAULT_CONFIG);
    expect(best).toBeNull();
  });
});
