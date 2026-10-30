import type { GameConfig } from './config';
import type { PawnState } from './board';
import { Game } from './game';
import { BENCH_CELL } from './position';

/** Save format of the desktop client (`core…persistence.GameStateSerializer`). */
export interface SavedGame {
  config: GameConfig;
  currentPlayerIndex: number;
  currentDice: number[];
  turnNumber: number;
  gameOver: boolean;
  winnerPlayerIndex: number;
  players: SavedPlayer[];
  cells: SavedCell[];
}

export interface SavedPlayer {
  playerIndex: number;
  color: string;
  human: boolean;
  pawns: SavedPawn[];
}

export interface SavedPawn {
  pawnIndex: number;
  state: PawnState;
  stepsTraveled: number;
  cellIndex: number;
  progress: number;
}

export interface SavedCell {
  index: number;
  x: number;
  y: number;
  type: string;
  occupantPlayerIndex: number | null;
  occupantColor: string | null;
  occupantPawnIndex: number | null;
  ownerPlayerIndex: number | null;
}

const COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

/** Reads a desktop save into a playable session. */
export function fromJson(json: string): Game {
  return fromSave(parseSaved(json));
}

export function fromSave(saved: SavedGame): Game {
  const game = new Game({ config: saved.config, playerIndex: saved.currentPlayerIndex });

  for (const player of saved.players) {
    game.human[player.playerIndex] = player.human;
    for (const pawn of player.pawns) {
      if (pawn.cellIndex === BENCH_CELL) continue;
      if (pawn.stepsTraveled > 0) game.board.position.move(player.playerIndex, pawn.pawnIndex, pawn.cellIndex);
      else game.board.position.place(player.playerIndex, pawn.pawnIndex, pawn.cellIndex);
    }
  }

  game.turnNumber = saved.turnNumber;
  game.gameOver = saved.gameOver;
  game.winnerPlayerIndex = saved.winnerPlayerIndex;
  game.remainingDice.splice(0, game.remainingDice.length, ...saved.currentDice);
  game.rolledDice.splice(0, game.rolledDice.length, ...saved.currentDice);
  return game;
}

export function snapshot(game: Game): SavedGame {
  const players: SavedPlayer[] = [];
  for (let playerIndex = 0; playerIndex < game.config.numberOfPlayers; playerIndex += 1) {
    const pawns: SavedPawn[] = [];
    for (let pawnIndex = 0; pawnIndex < game.config.numberOfPawns; pawnIndex += 1) {
      pawns.push({
        pawnIndex,
        state: game.board.pawnState(playerIndex, pawnIndex),
        stepsTraveled: game.board.position.hasMoved(playerIndex, pawnIndex) ? 1 : 0,
        cellIndex: game.board.position.cellOf(playerIndex, pawnIndex),
        progress: game.board.pawnProgress(playerIndex, pawnIndex),
      });
    }
    players.push({ playerIndex, color: COLORS[playerIndex % COLORS.length], human: game.isHuman(playerIndex), pawns });
  }

  const coordinates = cellCoordinates(game.config);
  const cells: SavedCell[] = game.board.cells.map((cell) => {
    const occupant = game.board.occupantAt(cell.index);
    return {
      index: cell.index,
      x: coordinates[cell.index][0],
      y: coordinates[cell.index][1],
      type: cell.type.toUpperCase(),
      occupantPlayerIndex: occupant?.playerIndex ?? null,
      occupantColor: occupant === null ? null : COLORS[occupant.playerIndex % COLORS.length],
      occupantPawnIndex: occupant?.pawnIndex ?? null,
      ownerPlayerIndex: cell.owner,
    };
  });

  return {
    config: game.config,
    currentPlayerIndex: game.playerIndex,
    currentDice: [...game.remainingDice],
    turnNumber: game.turnNumber,
    gameOver: game.gameOver,
    winnerPlayerIndex: game.winnerPlayerIndex,
    players,
    cells,
  };
}

/** Serialises in the exact shape and formatting of the desktop Jackson mapper. */
export function toJson(game: Game): string {
  return prettyPrint(snapshot(game) as unknown as Json);
}

/**
 * Board coordinates for the save file, copied from the desktop `BoardLayout`.
 * shortcut: assumes the four-corner rectangle, the ring is sliced for P < 4.
 */
export function cellCoordinates(config: GameConfig): Array<[number, number]> {
  const size = config.sideLength;
  const perimeter: Array<[number, number]> = [];
  for (let x = 0; x < size; x += 1) perimeter.push([x, 0]);
  for (let y = 1; y < size; y += 1) perimeter.push([size - 1, y]);
  for (let x = size - 2; x >= 0; x -= 1) perimeter.push([x, size - 1]);
  for (let y = size - 2; y >= 1; y -= 1) perimeter.push([0, y]);

  const coordinates = perimeter.slice(0, config.numberOfPlayers + config.numberOfPlayers * (size - 2));
  const cornerX = [0, size - 1, size - 1, 0];
  const cornerY = [0, 0, size - 1, size - 1];
  const dirX = [1, -1, -1, 1];
  const dirY = [1, 1, -1, -1];

  for (let playerIndex = 0; playerIndex < config.numberOfPlayers; playerIndex += 1) {
    for (let step = 1; step < config.numberOfPawns; step += 1) {
      coordinates.push([cornerX[playerIndex] + dirX[playerIndex] * step, cornerY[playerIndex] + dirY[playerIndex] * step]);
    }
  }
  return coordinates;
}

function parseSaved(json: string): SavedGame {
  return parseSavedGame(JSON.parse(json));
}

/** Validates an already-parsed value as a playable save; used for the web envelope too. */
export function parseSavedGame(value: unknown): SavedGame {
  if (typeof value !== 'object' || value === null) throw new Error('save is not an object');
  const saved = value as SavedGame;
  const { config, players } = saved;
  if (typeof config !== 'object' || config === null) throw new Error('save has no config');
  for (const key of ['sideLength', 'numberOfPlayers', 'numberOfPawns', 'numberOfDice', 'numberOfSidesOnDice', 'maxTurns'] as const) {
    if (typeof config[key] !== 'number') throw new Error(`save config.${key} is not a number`);
  }
  if (!Array.isArray(players) || players.length !== config.numberOfPlayers) throw new Error('save players do not match the config');
  for (const player of players) {
    if (!Array.isArray(player.pawns) || player.pawns.length !== config.numberOfPawns) throw new Error('save pawns do not match the config');
    for (const pawn of player.pawns) if (!Number.isInteger(pawn.cellIndex)) throw new Error('save pawn has no cellIndex');
  }
  if (!Array.isArray(saved.currentDice)) throw new Error('save currentDice is not a list');
  return saved;
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Jackson's `DefaultPrettyPrinter`: two-space objects, inline `[ ]` arrays, `"k" : v`. */
function prettyPrint(value: Json, level = 0): string {
  const pad = '  '.repeat(level);
  if (value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[ ]';
    return `[ ${value.map((item) => prettyPrint(item, level)).join(', ')} ]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '{ }';
  const body = entries
    .map(([key, item]) => `${'  '.repeat(level + 1)}${JSON.stringify(key)} : ${prettyPrint(item, level + 1)}`)
    .join(',\n');
  return `{\n${body}\n${pad}}`;
}
