export type MoveCommand =
  | { type: 'PlacePawn'; playerNumber: number; diceValue: number }
  | { type: 'MovePawn'; playerNumber: number; pawnNumber: number; steps: number; consumedDice: number[] }
  | { type: 'PlaceAndMove'; playerNumber: number; placeDice: number; moveDice: number };
