import { describe, it } from 'vitest';
import { Game, hasWon, seededRandom } from '../../src/engine';
import type { GameEvent, Move } from '../../src/engine';

/** Release runs use 100000; the default run stays at 10000 (ticket #4). */
const GAMES = Number(process.env.PESHKI_FUZZ_GAMES ?? 10_000);
const MAX_ACTIONS = 100_000;

describe('RULES.MD §16 invariants', () => {
  it(`audits ${GAMES} seeded random games after every move`, { timeout: 900_000 }, () => {
    const started = performance.now();
    for (let seed = 1; seed <= GAMES; seed += 1) playGame(seed);
    console.log(`fuzz: ${GAMES} games, ${Math.round(performance.now() - started)} ms`);
  });
});

/** One whole game driven by a random selector; every §13 invariant is audited. */
function playGame(seed: number): void {
  const random = seededRandom(seed);
  const game = new Game({ random });
  const history: string[] = [];
  let rollsThisTurn = 0;

  try {
    for (let action = 0; action < MAX_ACTIONS && !game.gameOver; action += 1) {
      const seat = game.playerIndex;

      game.rollDice();
      const dice = [...game.rolledDice];
      rollsThisTurn += 1;
      history.push(`P${seat} rolls ${dice.join('+')}`);
      auditBoard(game, history.at(-1) ?? '');
      if (rollsThisTurn > 2) fail('more than one extra roll in a turn');

      let killed = false;
      while (!game.gameOver && game.playerIndex === seat && game.remainingDice.length > 0) {
        const legal = game.legalMoves();
        if (legal.length === 0) fail('the session left dice unspent with no legal move');

        const move = legal[Math.floor(random() * legal.length)];
        history.push(`  P${seat} plays ${describeMove(move)}`);
        checkTarget(game, move);
        const diceBefore = [...game.remainingDice];
        const events = game.apply(move);

        if (events.some((event) => event.type === 'moveRejected')) fail('a legal move was rejected');
        checkLedger(diceBefore, game.remainingDice, move);
        checkKill(game, events);
        if (events.some((event) => event.type === 'pawnKilled')) killed = true;
        auditBoard(game, history.at(-1) ?? '');
        auditResult(game);
        if (game.gameOver && game.legalMoves().length > 0) fail('moves are still generated after the end');
      }

      if (game.gameOver) break;
      if (game.playerIndex === seat) {
        // The seat keeps the turn only for a granted extra roll (§10.3).
        if (!(killed || dice.includes(6))) fail('extra roll without a six or a kill');
      } else {
        // §10.4: the next seat is the next index, wrapping to zero.
        if (game.playerIndex !== (seat + 1) % game.config.numberOfPlayers) fail('turn order is not ascending');
        rollsThisTurn = 0;
      }
    }
    if (!game.gameOver) fail(`the game did not finish in ${MAX_ACTIONS} actions`);
  } catch (error) {
    throw new Error(`fuzz seed ${seed} failed after ${history.length} lines:\n${history.join('\n')}\n${String(error)}`);
  }
}

function auditBoard(game: Game, where: string): void {
  const { board } = game;
  const topology = board.topology;

  // §13.1 the ring is closed.
  for (let cell = 0; cell < topology.ringLength; cell += 1) {
    const next = topology.nextRingIndex(cell);
    if (next < 0 || next >= topology.ringLength) fail(`${where}: ring is not closed at ${cell}`);
  }

  // §13.2 at most one pawn per cell; §13.3 pawn indices stay put; §13.8 no enemy at home.
  const occupied = new Map<number, string>();
  for (let playerIndex = 0; playerIndex < game.config.numberOfPlayers; playerIndex += 1) {
    for (let pawnIndex = 0; pawnIndex < game.config.numberOfPawns; pawnIndex += 1) {
      const cell = board.position.cellOf(playerIndex, pawnIndex);
      if (cell < 0) continue;
      if (cell >= board.cells.length) fail(`${where}: P${playerIndex}.${pawnIndex} sits on cell ${cell} out of range`);
      const other = occupied.get(cell);
      if (other !== undefined) fail(`${where}: cell ${cell} holds both ${other} and P${playerIndex}.${pawnIndex}`);
      occupied.set(cell, `P${playerIndex}.${pawnIndex}`);
      const owner = board.cells[cell].owner;
      if (topology.isHomeCellIndex(cell) && owner !== playerIndex) {
        fail(`${where}: P${playerIndex}.${pawnIndex} is in the home tail of P${owner}`);
      }
    }
  }
}

function auditResult(game: Game): void {
  // §13.12 a win is all-but-one home plus the last pawn exactly on its corner.
  for (let playerIndex = 0; playerIndex < game.config.numberOfPlayers; playerIndex += 1) {
    if (hasWon(game.board, playerIndex) && game.winnerPlayerIndex !== playerIndex) {
      fail(`the win of P${playerIndex} was not recorded`);
    }
  }
  if (game.result === 'won' && !hasWon(game.board, game.winnerPlayerIndex)) fail('a winner without a winning position');
  // §13.13 a finished game without a winner is the turn limit only.
  if (game.result === 'draw' && game.turnNumber < game.config.maxTurns) fail('draw before maxTurns');
}

function checkTarget(game: Game, move: Move): void {
  const { board } = game;
  const corner = board.cornerCell(move.playerIndex);
  const newborn = board.isNewborn(move.playerIndex, move.pawnIndex);

  if (move.kind === 'place') {
    const occupant = board.occupantAt(corner);
    if (occupant !== null && occupant.playerIndex === move.playerIndex) fail('placement onto the own corner');
    if (move.steps > 0 && board.findTargetFromCorner(move.playerIndex, move.steps) !== move.targetCellIndex) {
      fail('place-and-move target is not reachable from the corner');
    }
    if (move.steps > 0 && move.targetCellIndex >= board.topology.ringLength) fail('place-and-move entered home');
    return;
  }

  // §13.4/§13.6 the generated target is the one the path search gives.
  if (board.findTarget(move.playerIndex, move.pawnIndex, move.steps) !== move.targetCellIndex) {
    fail('step target is not the one the path search gives');
  }
  // §13.5 a newborn only walks the ring.
  if (newborn && board.topology.isHomeCellIndex(move.targetCellIndex)) fail('a newborn entered home');
  // §13.7 while all-but-one pawns are home the last pawn only lands on its corner.
  if (board.countHome(move.playerIndex) === game.config.numberOfPawns - 1 && board.topology.isHomeCellIndex(move.targetCellIndex)) {
    fail('the last field pawn entered home instead of the corner');
  }
}

function checkLedger(before: readonly number[], after: readonly number[], move: Move): void {
  // §13.9 each die is spent once; a sum consumes both.
  const available = count(before);
  for (const value of move.consumedDice) {
    const left = available.get(value) ?? 0;
    if (left === 0) fail(`die ${value} was spent twice`);
    available.set(value, left - 1);
  }
  for (const value of after) {
    const left = available.get(value) ?? 0;
    if (left === 0) fail(`die ${value} was kept twice`);
    available.set(value, left - 1);
  }
  // Only the end of the cycle may drop the dice that are left (§10.1, step 2).
  if (after.length > 0) {
    for (const [value, left] of available) {
      if (left !== 0) fail(`die ${value} vanished while other dice remain`);
    }
  }
}

function checkKill(game: Game, events: GameEvent[]): void {
  for (const event of events) {
    if (event.type !== 'pawnKilled') continue;
    // §13.8 a killed pawn goes to the bench.
    if (!game.board.position.isBench(event.victimPlayerIndex, event.victimPawnIndex)) {
      fail('a killed pawn did not reach the bench');
    }
  }
}

function describeMove(move: Move): string {
  return `${move.kind} pawn${move.pawnIndex} by ${move.steps} with [${move.consumedDice.join('+')}]`;
}

function count(values: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function fail(reason: string): never {
  throw new Error(reason);
}
