import type { Board } from './board';
import { applyMove } from './apply';
import { generateMoves } from './moves';
import type { Move, PlaceMove, StepMove } from './moves';
import type { MoveSelector } from './selectors';

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

/** ADR-0003: a six chains into another roll, so the opponent's reply on a six weighs double. */
const SIX_WEIGHT = 2;

export const DIFFICULTIES = ['novice', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Level labels and behaviour in one place. */
export const DIFFICULTY_INFO = {
  /** Deliberate noise on the heuristic: it can pass over a kill. */
  novice: { label: 'Новичок' },
  /** The plain heuristic: win > last field pawn kill > kill > home > enemy corner > own corner > progress. */
  normal: { label: 'Обычный' },
  /** The heuristic plus a one-ply check of the opponent's best answer to every dice value. */
  hard: { label: 'Сложный' },
} as const satisfies Record<Difficulty, { label: string }>;

export interface BotOptions {
  /** Seeded in tests; novice is the only level that consumes it. */
  random?: () => number;
}

export function createBot(board: Board, difficulty: Difficulty, options: BotOptions = {}): MoveSelector {
  const random = options.random ?? Math.random;
  return (legal) => {
    let best: Move | null = null;
    let bestScore = -Infinity;
    for (const move of legal) {
      // Strict comparison keeps the first legal move on a tie, like the core stream max.
      const score = scoreFor(board, move, difficulty, random);
      if (score > bestScore) {
        best = move;
        bestScore = score;
      }
    }
    return best;
  };
}

function scoreFor(board: Board, move: Move, difficulty: Difficulty, random: () => number): number {
  if (difficulty === 'hard') return scoreHard(board, move);
  const base = scoreMove(board, move);
  if (difficulty === 'normal' || base >= WIN) return base;
  return base + Math.floor(random() * NOVICE_NOISE);
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
 * One-ply lookahead: score the move, then subtract the opponent's best answer,
 * averaged over one die. Sixes weigh double because a six chains (ADR-0003).
 * shortcut: the reply assumes the turn passes and the opponent rolls once; a deeper
 * search would handle the chained turn and the second die, upgrade when hard bots feel dull.
 */
function scoreHard(board: Board, move: Move): number {
  const base = scoreMove(board, move);
  if (base >= WIN) return base * 2;

  const next = board.clone();
  const events = applyMove(next, move);
  // A kill or a six keeps the turn (ADR-0003), so there is no opponent reply to weigh.
  const keepsTurn = move.consumedDice.includes(6) || events.some((event) => event.type === 'pawnKilled');
  if (keepsTurn) return base * 2;

  const opponent = (move.playerIndex + 1) % next.config.numberOfPlayers;
  let total = 0;
  let weight = 0;
  for (let value = 1; value <= next.config.numberOfSidesOnDice; value += 1) {
    const replyWeight = value === 6 ? SIX_WEIGHT : 1;
    let bestReply = 0;
    for (const reply of generateMoves(next, opponent, [value])) {
      bestReply = Math.max(bestReply, scoreMove(next, reply));
    }
    total += replyWeight * bestReply;
    weight += replyWeight;
  }
  return base * 2 - total / weight;
}
