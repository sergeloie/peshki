export interface GameConfig {
  sideLength: number;
  numberOfPlayers: number;
  numberOfPawns: number;
  numberOfDice: number;
  numberOfSidesOnDice: number;
}

export const DEFAULT_CONFIG: GameConfig = Object.freeze({
  sideLength: 8,
  numberOfPlayers: 4,
  numberOfPawns: 4,
  numberOfDice: 2,
  numberOfSidesOnDice: 6,
});

export interface DerivedConfig {
  fieldLength: number;
  ringLength: number;
  homeLength: number;
  totalCells: number;
}

export function derive(config: GameConfig): DerivedConfig {
  const fieldLength = config.numberOfPlayers * (config.sideLength - 2);
  const ringLength = config.numberOfPlayers + fieldLength;
  const homeLength = config.numberOfPawns - 1;
  return { fieldLength, ringLength, homeLength, totalCells: ringLength + config.numberOfPlayers * homeLength };
}

export function validateConfig(config: GameConfig): void {
  if (config.numberOfPlayers < 2 || config.numberOfPlayers > 4) {
    throw new RangeError(`numberOfPlayers must be 2..4, got ${config.numberOfPlayers}`);
  }
  if (config.sideLength < 2) throw new RangeError(`sideLength must be >= 2, got ${config.sideLength}`);
  if (config.numberOfPawns < 1) throw new RangeError(`numberOfPawns must be >= 1, got ${config.numberOfPawns}`);
  if (config.numberOfDice < 1) throw new RangeError(`numberOfDice must be >= 1, got ${config.numberOfDice}`);
  if (config.numberOfSidesOnDice < 1) {
    throw new RangeError(`numberOfSidesOnDice must be >= 1, got ${config.numberOfSidesOnDice}`);
  }
}
