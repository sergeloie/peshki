export interface GameConfig {
  sideLength: number;
  numberOfPlayers: number;
  numberOfPawns: number;
  numberOfDice: number;
  numberOfSidesOnDice: number;
  maxTurns: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  sideLength: 8,
  numberOfPlayers: 4,
  numberOfPawns: 4,
  numberOfDice: 2,
  numberOfSidesOnDice: 6,
  maxTurns: 5000,
};

export function fieldLength(config: GameConfig): number {
  return config.numberOfPlayers * (config.sideLength - 2);
}

export function homeLength(config: GameConfig): number {
  return config.numberOfPawns - 1;
}
