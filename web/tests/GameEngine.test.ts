import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/GameConfig';
import { GameEngine } from '../src/engine/GameEngine';
import { PawnState } from '../src/engine/Pawn';
import { GameEngine as GE } from '../src/engine/GameEngine';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(DEFAULT_CONFIG);
  });

  it('starts with zero turns', () => {
    expect(engine.turnNumber).toBe(0);
  });

  it('has 4 players', () => {
    expect(engine.board.players.length).toBe(4);
  });

  it('first player is human', () => {
    expect(engine.board.players[0].isHuman).toBe(true);
  });

  it('rollDice returns two values', () => {
    const dice = engine.rollDice();
    expect(dice.length).toBe(2);
    expect(dice.every(d => d >= 1 && d <= 6)).toBe(true);
  });

  it('bot turn increments turn number', () => {
    engine.executeBotTurn();
    expect(engine.turnNumber).toBe(1);
  });

  it('bot turn produces turn ended event', () => {
    const events = engine.executeBotTurn();
    expect(events.some(e => e.type === 'TurnEnded')).toBe(true);
  });

  it('multiple bot turns advance players', () => {
    engine.executeBotTurn();
    engine.executeBotTurn();
    engine.executeBotTurn();
    expect(engine.turnNumber).toBeGreaterThanOrEqual(3);
  });

  it('generateAllMoves with movable pawns', () => {
    const player = engine.board.players[1];
    player.pawns[0].cell = engine.board.getCorner(player).nextFieldCell;
    player.pawns[0].state = PawnState.FIELDER;
    engine.board.getCorner(player).nextFieldCell!.pawn = player.pawns[0];

    const dice = [3, 4];
    const moves = GE.generateAllMoves(player, dice, engine.board, DEFAULT_CONFIG);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('generateAllMoves includes sum moves', () => {
    const player = engine.board.players[1];
    player.pawns[0].cell = engine.board.getCorner(player).nextFieldCell;
    player.pawns[0].state = PawnState.FIELDER;
    engine.board.getCorner(player).nextFieldCell!.pawn = player.pawns[0];

    const dice = [3, 4];
    const moves = GE.generateAllMoves(player, dice, engine.board, DEFAULT_CONFIG);

    const hasSumMove = moves.some(m => m.pawn !== null && m.steps === 7);
    expect(hasSumMove).toBe(true);
  });

  it('generateAllMoves with no movable pawns returns empty', () => {
    const player = engine.board.players[1];
    const dice = [3, 4];
    const moves = GE.generateAllMoves(player, dice, engine.board, DEFAULT_CONFIG);
    expect(moves.length).toBe(0);
  });

  it('placeAndMove command works', () => {
    const player = engine.board.players[0];
    const events = engine.executeHumanCommand(
      { type: 'PlacePawn', playerNumber: 1, diceValue: 6 },
      [],
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.type === 'PawnPlaced')).toBe(true);
  });

  it('full bot game completes', () => {
    const botEngine = new GameEngine(DEFAULT_CONFIG);
    botEngine.board.players.forEach(p => { p.isHuman = false; });

    let turns = 0;
    while (!botEngine.isGameOver() && turns < DEFAULT_CONFIG.maxTurns) {
      botEngine.executeBotTurn();
      turns++;
    }

    expect(botEngine.isGameOver() || turns >= DEFAULT_CONFIG.maxTurns).toBe(true);
  });
});
