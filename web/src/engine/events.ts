export type GameEvent =
  | { type: 'diceRolled'; playerIndex: number; values: number[] }
  | { type: 'pawnPlaced'; playerIndex: number; pawnIndex: number; cellIndex: number }
  | { type: 'pawnMoved'; playerIndex: number; pawnIndex: number; fromCell: number; toCell: number; steps: number }
  | { type: 'pawnKilled'; killerPlayerIndex: number; killerPawnIndex: number; victimPlayerIndex: number; victimPawnIndex: number }
  | { type: 'enteredHome'; playerIndex: number; pawnIndex: number }
  | { type: 'turnEnded'; playerIndex: number }
  | { type: 'gameWon'; playerIndex: number }
  | { type: 'gameDrawn'; turnNumber: number }
  | { type: 'moveRejected'; reason: string };
