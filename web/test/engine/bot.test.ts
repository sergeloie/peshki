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
    const move = select(board, 'normal', legal, [3, 4]);

    expect(move.kind).toBe('step');
    expect(move.steps).toBe(7);
    expect(move.targetCellIndex).toBe(board.cornerCell(0));
  });

  it('normal prefers a kill over entering home', () => {
    const board = killOrHomeBoard();
    const legal = generateMoves(board, 0, [2]);
    const move = select(board, 'normal', legal, [2]);

    expect(move.pawnIndex).toBe(1);
    expect(board.occupantAt(move.targetCellIndex)?.playerIndex).toBe(1);
  });

  it('novice noise can pass over the same kill', () => {
    const board = killOrHomeBoard();
    const legal = generateMoves(board, 0, [2]);
    const values = [0.99, 0];
    let index = 0;
    const move = createBot(board, 'novice', { random: () => values[index++] ?? 0 })(legal, { dice: [2] });

    expect(move?.pawnIndex).toBe(0);
  });

  it('hard takes the only winning move without touching the live board', () => {
    const board = new Board(DEFAULT_CONFIG);
    movePawns(board, [
      { player: 0, pawn: 0, cell: 25 },
      { player: 0, pawn: 1, cell: 28 },
      { player: 0, pawn: 2, cell: 29 },
      { player: 0, pawn: 3, cell: 30 },
    ]);
    const legal = generateMoves(board, 0, [3, 4]);
    const move = select(board, 'hard', legal, [3, 4]);

    expect(move.kind).toBe('step');
    expect(move.steps).toBe(3);
    expect(move.targetCellIndex).toBe(board.cornerCell(0));
    expect(board.position.cellOf(0, 0)).toBe(25);
    expect(board.position.cellOf(0, 1)).toBe(28);
  });

  it('all three levels choose the same move for the same seed and position', () => {
    for (const difficulty of DIFFICULTIES) {
      const { board, legal } = fixedPosition();
      const first = createBot(board, difficulty, { random: seededRandom(11) })(legal, { dice: [3, 4] });
      const second = createBot(board, difficulty, { random: seededRandom(11) })(legal, { dice: [3, 4] });
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

  it('reports the difficulty matrix and a monotone ladder over fixed seeds', { timeout: 1_800_000 }, () => {
    const games = Number(process.env.PESHKI_BOT_BATCH_GAMES ?? 500);
    const wins = Object.fromEntries(DIFFICULTIES.map((level) => [level, { ...emptyRow() }])) as Record<Difficulty, Record<Difficulty, number>>;
    const drawn = Object.fromEntries(DIFFICULTIES.map((level) => [level, { ...emptyRow() }])) as Record<Difficulty, Record<Difficulty, number>>;

    for (const seat0 of DIFFICULTIES) {
      for (const others of DIFFICULTIES) {
        const result = batch(games, seat0, others);
        wins[seat0][others] = result.seat0Wins;
        drawn[seat0][others] = result.draws;
      }
    }

    const percent = (value: number) => `${((value / games) * 100).toFixed(1)}%`;
    console.log(`difficulty matrix: seat 0 wins out of ${games} seeded games, draws in parentheses`);
    console.log(`seat 0 \\ 3 bots | ${DIFFICULTIES.join(' | ')}`);
    for (const seat0 of DIFFICULTIES) {
      const cells = DIFFICULTIES.map((others) => `${percent(wins[seat0][others])} (${drawn[seat0][others]})`);
      console.log(`${seat0.padEnd(14)} | ${cells.join(' | ')}`);
    }
    // Seat 0 holds one of four seats, so an equal-level game sits near a 25% baseline.
    console.log(`positional baseline: ${percent(games / 4)} (one of four seats)`);

    // The all-normal column is the clean ladder: same opponents, only seat 0 changes.
    expect(wins.normal.normal).toBeGreaterThan(wins.novice.normal);
    expect(wins.hard.normal).toBeGreaterThan(wins.normal.normal);
    // Equal-level cells sit at the positional baseline within five points.
    for (const level of DIFFICULTIES) expect(Math.abs(wins[level][level] / games - 0.25), level).toBeLessThan(0.05);
  });
});

function select(board: Board, difficulty: Difficulty, legal: readonly Move[], dice: readonly number[]): Move {
  const move = createBot(board, difficulty, { random: seededRandom(11) })(legal, { dice });
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

function emptyRow(): Record<Difficulty, number> {
  return { novice: 0, normal: 0, hard: 0 };
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
