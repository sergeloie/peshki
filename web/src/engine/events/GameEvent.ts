export type GameEvent =
  | { type: 'DiceRolled'; playerNumber: number; values: number[] }
  | { type: 'PawnPlaced'; playerNumber: number; pawnNumber: number; cellIndex: number }
  | { type: 'PawnMoved'; playerNumber: number; pawnNumber: number; fromCell: number; toCell: number; steps: number }
  | { type: 'PawnKilled'; killerPlayer: number; killerPawn: number; victimPlayer: number; victimPawn: number }
  | { type: 'EnteredHome'; playerNumber: number; pawnNumber: number }
  | { type: 'TurnEnded'; playerNumber: number; extraTurn: boolean }
  | { type: 'GameWon'; playerNumber: number }
  | { type: 'MoveRejected'; reason: string };
