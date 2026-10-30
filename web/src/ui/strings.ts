/**
 * User-facing strings for ticket #6. Ticket #7 (i18n) lifts this whole object
 * into locale files; until then it stays the single source of strings in ui/.
 */
export const STRINGS = {
  appTitle: 'Пешки',
  menuPlay: 'Играть',
  gameYourMove: 'Ваш ход',
  gameYourMoveRoll: 'Ваш ход — бросайте',
  gameBotMove: 'Ход соперника',
  gameBotThinking: 'думает…',
  gameThrow: 'Бросить',
  gameExtraRoll: 'Ещё бросок!',
  gameUsedDice: 'Кубик потрачен',
  gameNoMoves: 'Нет доступных ходов',
  gamePlace: 'Выставить',
  gamePlaceAndMove: 'Выставить и сходить на {n}',
  gameSumHint: '{sum} = {a} + {b}',
  gameYou: 'Вы',
  gameTurnNumber: 'Ход № {n}',
  pawnKilled: 'Пешка сбита!',
  pawnEnteredHome: 'Пешка в доме',
  pawnOnBench: 'На скамье: {n}',
  resultWinner: 'Победил игрок {n}',
  resultDraw: 'Ничья: лимит {n} ходов',
} as const;

export function format(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export const BOT_NAMES = ['Оскар', 'Нина', 'Гектор'];

/** Seat label: engine player index -> display name. */
export function seatLabel(playerIndex: number): string {
  if (playerIndex === 0) return STRINGS.gameYou;
  return BOT_NAMES[playerIndex - 1] ?? `Игрок ${playerIndex + 1}`;
}
