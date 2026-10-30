import { Board, DEFAULT_CONFIG, Game } from '../../src/engine';
import type { GameConfig, GameEvent, StepMove } from '../../src/engine';

export interface PawnSetup {
  player: number;
  pawn: number;
  cell: number;
  moved?: boolean;
}

export function setupBoard(pawns: PawnSetup[] = []): Board {
  const board = new Board(DEFAULT_CONFIG);
  placePawns(board, pawns);
  return board;
}

/** A session whose dice replay the scripted rolls in order. */
export function setupGame(options: {
  config?: GameConfig;
  rolls?: number[][];
  playerIndex?: number;
  pawns?: PawnSetup[];
} = {}): Game {
  const game = new Game({
    config: options.config,
    playerIndex: options.playerIndex,
    random: scriptedDice(options.rolls ?? [[1, 2]]),
  });
  placePawns(game.board, options.pawns ?? []);
  return game;
}

/** Each die value `v` becomes a random in `[(v-1)/6, v/6)`, so `floor(r * 6) + 1 === v`. */
export function scriptedDice(rolls: number[][]): () => number {
  const queue = rolls.flat();
  let index = 0;
  return () => (((queue[index++] ?? 1) - 1) + 0.5) / 6;
}

export function stepMove(
  board: Board,
  playerIndex: number,
  pawnIndex: number,
  steps: number,
  dice: number[] = [steps],
): StepMove {
  const target = board.findTarget(playerIndex, pawnIndex, steps);
  if (target === null) throw new Error(`No target for ${steps} steps`);
  return { kind: 'step', playerIndex, pawnIndex, steps, consumedDice: dice, targetCellIndex: target };
}

export function eventTypes(events: GameEvent[]): string[] {
  return events.map((event) => event.type);
}

function placePawns(board: Board, pawns: PawnSetup[]): void {
  for (const setup of pawns) {
    if (setup.moved ?? true) board.position.move(setup.player, setup.pawn, setup.cell);
    else board.position.place(setup.player, setup.pawn, setup.cell);
  }
}
