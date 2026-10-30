import type { Board } from './board';
import { applyMove } from './apply';
import { generateMoves } from './moves';
import type { Move, PlaceMove, StepMove } from './moves';
import type { MoveSelector } from './selectors';
import { hasWon } from './win';

/** Scoring constants ported from core `BotStrategy`; higher is better. */
const WIN = 1_000_000;
const LAST_FIELD_PAWN_KILL = 900_000;
const KILL = 800_000;
const ENTER_HOME = 700_000;
const ENEMY_CORNER = 600_000;
const OWN_CORNER = 500_000;
const PROGRESS = 400_000;

/** Novice jitter stays below a winning move and can lift a plain step over a kill. */
const NOVICE_NOISE = 750_000;

/** How much the field's progress is worth against ours in the hard planner. */
const RIVAL_WEIGHT = 0.5;

export const DIFFICULTIES = ['novice', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Level labels and behaviour in one place. */
export const DIFFICULTY_INFO = {
  /** Deliberate noise on the heuristic: it can pass over a kill. */
  novice: { label: 'Новичок' },
  /** The plain heuristic: win > last field pawn kill > kill > home > enemy corner > own corner > progress. */
  normal: { label: 'Обычный' },
  /** Plans the whole current roll by board value (our home/progress minus half of the field's), not one move ahead. */
  hard: { label: 'Сложный' },
} as const satisfies Record<Difficulty, { label: string }>;

export interface BotOptions {
  /** Seeded in tests; novice is the only level that consumes it. */
  random?: () => number;
  /** Remaining dice for this decision; hard plans the whole roll with them. */
  dice?: () => readonly number[];
}

export function createBot(board: Board, difficulty: Difficulty, options: BotOptions = {}): MoveSelector {
  const random = options.random ?? Math.random;
  return (legal) => {
    const dice = difficulty === 'hard' ? (options.dice ? [...options.dice()] : inferDice(legal)) : [];
    let best: Move | null = null;
    let bestScore = -Infinity;
    for (const move of legal) {
      // Strict comparison keeps the first legal move on a tie, like the core stream max.
      const score = scoreFor(board, move, difficulty, random, dice);
      if (score > bestScore) {
        best = move;
        bestScore = score;
      }
    }
    return best;
  };
}

function scoreFor(board: Board, move: Move, difficulty: Difficulty, random: () => number, dice: readonly number[]): number {
  if (difficulty === 'hard') return planTurn(board, move, dice);
  const base = scoreMove(board, move);
  if (difficulty === 'normal' || base >= WIN) return base;
  return base + Math.floor(random() * NOVICE_NOISE);
}

/** The dice left in the roll when the caller has no ledger at hand (tests, single-die calls). */
function inferDice(legal: readonly Move[]): number[] {
  const pair = legal.find((move) => move.consumedDice.length === 2);
  if (pair !== undefined) return [...pair.consumedDice];
  return [...new Set(legal.flatMap((move) => move.consumedDice))];
}

function scoreMove(board: Board, move: Move): number {
  return move.kind === 'place' ? scorePlace(board, move) : scoreStep(board, move);
}

function scorePlace(board: Board, move: PlaceMove): number {
  const occupant = board.occupantAt(board.cornerCell(move.playerIndex));
  return occupant !== null && occupant.playerIndex !== move.playerIndex ? KILL : 100_000;
}

function scoreStep(board: Board, move: StepMove): number {
  const { playerIndex, pawnIndex, steps } = move;
  const target = board.findTarget(playerIndex, pawnIndex, steps);
  if (target === null) return -1;

  const occupant = board.occupantAt(target);
  const killsEnemy = !board.isHome(playerIndex, pawnIndex) && occupant !== null && occupant.playerIndex !== playerIndex;
  const entersHome = board.isFielder(playerIndex, pawnIndex) && board.topology.isHomeCellIndex(target);

  const source = board.position.cellOf(playerIndex, pawnIndex);
  const onEnemyCorner = board.topology.isCornerRingIndex(source) && board.topology.cornerOwner(source) !== playerIndex;
  const onOwnCorner = source === board.cornerCell(playerIndex);

  if (isWinningMove(board, playerIndex, pawnIndex, steps)) return WIN;
  if (killsEnemy && isEnemyLastFieldPawn(board, occupant.playerIndex)) return LAST_FIELD_PAWN_KILL;
  if (killsEnemy) return KILL;
  if (entersHome) return ENTER_HOME;
  if (onEnemyCorner) return ENEMY_CORNER;
  if (onOwnCorner) return OWN_CORNER;

  const maxDistance = board.topology.derived.fieldLength;
  const distance = board.isHome(playerIndex, pawnIndex) ? 0 : (board.cornerCell(playerIndex) - source + board.topology.ringLength) % board.topology.ringLength;
  return PROGRESS + (maxDistance - distance);
}

/** `WinChecker.isWinningMove`: the last field pawn landing exactly on its own corner. */
function isWinningMove(board: Board, playerIndex: number, pawnIndex: number, steps: number): boolean {
  if (board.isHome(playerIndex, pawnIndex)) return false;
  const target = board.findTarget(playerIndex, pawnIndex, steps);
  return target !== null && target === board.cornerCell(playerIndex) && board.countHome(playerIndex) === board.config.numberOfPawns - 1;
}

/** The enemy has all but one pawn home and this is their only fielder. */
function isEnemyLastFieldPawn(board: Board, enemyIndex: number): boolean {
  if (board.countHome(enemyIndex) !== board.config.numberOfPawns - 1) return false;
  let fielders = 0;
  for (let pawnIndex = 0; pawnIndex < board.config.numberOfPawns; pawnIndex += 1) {
    if (board.isFielder(enemyIndex, pawnIndex)) fielders += 1;
  }
  return fielders === 1;
}

/**
 * Hard plays out the whole current roll: the first move is chosen by exhaustively
 * trying each legal move, then the rest of the dice are spent greedily on the best
 * resulting board. `RIVAL_WEIGHT` makes a kill worth its progress loss to the field.
 * shortcut: only the current roll is planned; the opponent's reply and chained extra
 * rolls are not simulated, upgrade when hard needs a real search.
 */
function planTurn(board: Board, move: Move, dice: readonly number[]): number {
  const next = board.clone();
  applyMove(next, move);
  return playOut(next, move.playerIndex, removeDice(dice, move.consumedDice));
}

function playOut(board: Board, playerIndex: number, dice: readonly number[]): number {
  // A plan that reaches the win beats any positional score.
  if (hasWon(board, playerIndex)) return 1e15;
  if (dice.length === 0) return evalBoard(board, playerIndex);

  let best: Board | null = null;
  let bestValue = -Infinity;
  let bestDice: number[] = [];
  for (const move of generateMoves(board, playerIndex, dice)) {
    const next = board.clone();
    applyMove(next, move);
    const value = hasWon(next, playerIndex) ? 1e15 : evalBoard(next, playerIndex);
    if (value > bestValue) {
      best = next;
      bestValue = value;
      bestDice = removeDice(dice, move.consumedDice);
    }
  }
  if (best === null) return evalBoard(board, playerIndex);
  return playOut(best, playerIndex, bestDice);
}

/** Our home count and progress, less a share of every rival's, so kills register. */
function evalBoard(board: Board, playerIndex: number): number {
  let value = board.countHome(playerIndex) * 1_000_000;
  let rivals = 0;
  for (let other = 0; other < board.config.numberOfPlayers; other += 1) {
    const home = board.countHome(other);
    let progress = 0;
    for (let pawnIndex = 0; pawnIndex < board.config.numberOfPawns; pawnIndex += 1) {
      progress += board.pawnProgress(other, pawnIndex);
    }
    if (other === playerIndex) value += progress;
    else rivals += home * 1_000_000 + progress;
  }
  return value - RIVAL_WEIGHT * rivals;
}

function removeDice(pool: readonly number[], spent: readonly number[]): number[] {
  const left = [...pool];
  for (const value of spent) {
    const index = left.indexOf(value);
    if (index >= 0) left.splice(index, 1);
  }
  return left;
}
