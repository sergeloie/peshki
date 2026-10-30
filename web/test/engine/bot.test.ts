import { describe, expect, it } from 'vitest';
import {
  Board,
  DEFAULT_CONFIG,
  DIFFICULTIES,
  Game,
  createBot,
  generateMoves,
  moveKey,
  seededRandom,
} from '../../src/engine';
import type { Difficulty, Move, MoveSelector } from '../../src/engine';

const SEVEN_SHORT = [
  { player: 0, pawn: 0, cell: 21 },
  { player: 0, pawn: 1, cell: 28 },
  { player: 0, pawn: 2, cell: 29 },
  { player: 0, pawn: 3, cell: 30 },
];

/** A home entry (700k) next to a kill (800k) with the same die. */
function killOrHomeBoard(): Board {
  const board = new Board(DEFAULT_CONFIG);
  board.position.move(0, 0, 0);
  board.position.move(0, 1, 3);
  board.position.move(1, 0, 5);
  return board;
}

function movePawns(board: Board, pawns: Array<{ player: number; pawn: number; cell: number; moved?: boolean }>): void {
  for (const setup of pawns) {
    if (setup.moved ?? true) board.position.move(setup.player, setup.pawn, setup.cell);
    else board.position.place(setup.player, setup.pawn, setup.cell);
  }
}

describe('bot scoring port (core BotStrategy)', () => {
  it('normal takes the winning move', () => {
    const board = new Board(DEFAULT_CONFIG);
    movePawns(board, SEVEN_SHORT);
    const legal = generateMoves(board, 0, [3, 4]);
    const move = select(board, 'normal', legal);

    expect(move.kind).toBe('step');
    expect(move.steps).toBe(7);
    expect(move.targetCellIndex).toBe(board.cornerCell(0));
  });

  it('normal prefers a kill over entering home', () => {
    const board = killOrHomeBoard();
    const legal = generateMoves(board, 0, [2]);
    const move = select(board, 'normal', legal);

    expect(move.pawnIndex).toBe(1);
    expect(board.occupantAt(move.targetCellIndex)?.playerIndex).toBe(1);
  });

  it('novice noise can pass over the same kill', () => {
    const board = killOrHomeBoard();
    const legal = generateMoves(board, 0, [2]);
    const values = [0.99, 0];
    let index = 0;
    const move = createBot(board, 'novice', { random: () => values[index++] ?? 0 })(legal);

    expect(move?.pawnIndex).toBe(0);
  });

  it('hard takes the winning move without touching the live board', () => {
    const board = new Board(DEFAULT_CONFIG);
    movePawns(board, SEVEN_SHORT);
    const legal = generateMoves(board, 0, [3, 4]);
    const move = select(board, 'hard', legal);

    expect(move.steps).toBe(7);
    expect(board.position.cellOf(0, 0)).toBe(21);
    expect(board.position.cellOf(0, 1)).toBe(28);
  });

  it('all three levels choose the same move for the same seed and position', () => {
    for (const difficulty of DIFFICULTIES) {
      const { board, legal } = fixedPosition();
      const first = createBot(board, difficulty, { random: seededRandom(11) })(legal);
      const second = createBot(board, difficulty, { random: seededRandom(11) })(legal);
      expect(first, difficulty).not.toBeNull();
      expect(moveKey(first as Move), difficulty).toBe(moveKey(second as Move));
    }
  });
});

describe('bot batch', () => {
  it('plays 100 auto games with the human seat also driven by the bot', { timeout: 600_000 }, () => {
    const games = 100;
    let draws = 0;
    for (let seed = 1; seed <= games; seed += 1) {
      const difficulty = DIFFICULTIES[seed % DIFFICULTIES.length];
      const game = playAutoGame(seed, difficulty, difficulty);
      expect(game.gameOver, `seed ${seed} did not finish`).toBe(true);
      if (game.result === 'draw') draws += 1;
    }
    console.log(`bot batch: ${games} games across all levels, ${draws} draws, no stuck state`);
  });

  it('novice loses to normal more often than normal loses to novice', { timeout: 600_000 }, () => {
    const games = Number(process.env.PESHKI_BOT_BATCH_GAMES ?? 100);
    const noviceFirst = batch(games, 'novice', 'normal');
    const normalFirst = batch(games, 'normal', 'novice');
    const hardFirst = batch(games, 'hard', 'normal');
    const baseline = batch(games, 'normal', 'normal');

    console.log(
      `bot win rates over seeds 1..${games}: novice(seat 0) ${noviceFirst.seat0Wins} vs normal ${noviceFirst.othersWins} (${noviceFirst.draws} draws); ` +
        `normal(seat 0) ${normalFirst.seat0Wins} vs novice ${normalFirst.othersWins} (${normalFirst.draws} draws); ` +
        `hard(seat 0) ${hardFirst.seat0Wins} vs normal ${hardFirst.othersWins} (${hardFirst.draws} draws); ` +
        `normal(seat 0) ${baseline.seat0Wins} vs normal ${baseline.othersWins} (${baseline.draws} draws)`,
    );
    expect(noviceFirst.seat0Wins).toBeLessThan(normalFirst.seat0Wins);
    expect(noviceFirst.othersWins).toBeGreaterThan(normalFirst.othersWins);
  });
});

function select(board: Board, difficulty: Difficulty, legal: readonly Move[]): Move {
  const move = createBot(board, difficulty, { random: seededRandom(11) })(legal);
  if (move === null) throw new Error('the bot returned no move');
  return move;
}

/** A mid-game position with dice [3, 4], independent of the batch games. */
function fixedPosition(): { board: Board; legal: Move[] } {
  const board = new Board(DEFAULT_CONFIG);
  movePawns(board, [
    { player: 0, pawn: 0, cell: 3 },
    { player: 0, pawn: 1, cell: 9 },
    { player: 0, pawn: 2, cell: 16 },
    { player: 1, pawn: 0, cell: 7 },
  ]);
  return { board, legal: generateMoves(board, 0, [3, 4]) };
}

function playAutoGame(seed: number, seat0: Difficulty, others: Difficulty): Game {
  const game = new Game({ humanPlayerIndex: -1, random: seededRandom(seed) });
  const selectors: MoveSelector[] = Array.from({ length: game.config.numberOfPlayers }, (_, index) =>
    createBot(game.board, index === 0 ? seat0 : others, { random: seededRandom(seed * 31 + index) }),
  );

  for (let turn = 0; !game.gameOver && turn < 100_000; turn += 1) {
    const events = game.playSeatTurn(selectors[game.playerIndex]);
    if (events.some((event) => event.type === 'moveRejected')) {
      throw new Error(`seed ${seed}: the bot produced an illegal move`);
    }
  }
  return game;
}

function batch(games: number, seat0: Difficulty, others: Difficulty): { seat0Wins: number; othersWins: number; draws: number } {
  let seat0Wins = 0;
  let othersWins = 0;
  let draws = 0;
  for (let seed = 1; seed <= games; seed += 1) {
    const game = playAutoGame(seed, seat0, others);
    expect(game.gameOver, `seed ${seed} did not finish`).toBe(true);
    if (game.result === 'draw') draws += 1;
    else if (game.winnerPlayerIndex === 0) seat0Wins += 1;
    else othersWins += 1;
  }
  return { seat0Wins, othersWins, draws };
}
