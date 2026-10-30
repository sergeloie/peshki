import type { Dictionary } from './index';

/** English strings; translated from the Russian set so widths stay close to the tuned layout. */
export const en: Dictionary = {
  'app.title': 'Peshki',

  'menu.play': 'Play',
  'menu.howto': 'How to play',
  'menu.settings': 'Settings',

  'game.yourMove': 'Your move',
  'game.yourMoveRoll': 'Your move — roll the dice',
  'game.botMove': 'Opponent\u2019s move',
  'game.thinking': 'thinking\u2026',
  'game.throw': 'Roll',
  'game.sumHint': '{sum} = {a} + {b}',
  'game.place': 'Place',
  'game.placeAndMove': 'Place and walk {n}',
  'game.usedDice': 'Die spent',
  'game.noMoves': 'No legal moves',
  'game.exactCorner': 'The last pawn must land exactly on your corner — overshooting is not allowed.',
  'game.you': 'You',
  'game.botName1': 'Oscar',
  'game.botName2': 'Nina',
  'game.botName3': 'Hector',
  'game.playerN': 'Player {n}',
  'game.turns': 'Turn {n}',
  'game.pause': 'Pause',

  'pawn.onBench': 'On the bench: {n}',
  'pawn.killed': 'Pawn captured!',
  'pawn.enteredHome': 'Pawn home',

  'pause.resume': 'Resume',
  'pause.exit': 'Back to menu',
  'exit.confirmTitle': 'Leave the game?',
  'exit.confirmText': 'The current game will be lost.',
  'exit.yes': 'Leave',
  'exit.no': 'Stay',

  'victory.title': 'Victory!',
  'victory.subtitle': {
    one: 'You got there first, in {n} turn',
    few: 'You got there first, in {n} turn',
    many: 'You got there first, in {n} turns',
    other: 'You got there first, in {n} turns',
  },
  'defeat.title': 'Defeat',
  'defeat.subtitle': {
    one: '{name} won, in {n} turn',
    few: '{name} won, in {n} turn',
    many: '{name} won, in {n} turns',
    other: '{name} won, in {n} turns',
  },
  'draw.title': 'Draw',
  'draw.answers': 'Turn limit reached — no winner',
  'result.again': 'Play again',
  'result.menu': 'Menu',

  'settings.title': 'Settings',
  'settings.sound': 'Sound',
  'settings.language': 'Language',
  'settings.langRU': 'Русский',
  'settings.langEn': 'English',

  'howto.title': 'How to play',
  'howto.next': 'Next',
  'howto.goal.label': 'Goal',
  'howto.goal.text':
    'Walk all four pawns into home: three onto the home steps and the last one exactly onto your corner. Whoever gets there first wins.',
  'howto.move.label': 'Movement',
  'howto.move.text':
    'Two dice are two separate moves. Or add them up: rolled 3 and 4 — walk 3, 4 or 7.',
  'howto.six.label': 'The six',
  'howto.six.text':
    'Roll a six to bring a pawn from the bench onto your corner, if no pawn of yours is there. You may place and immediately walk with the second die. A six or a capture earns another roll; a six on that roll earns another.',
  'howto.kill.label': 'Capture',
  'howto.kill.text':
    'Land on an enemy pawn and it goes back to the bench. Your own pawn blocks the path — nothing jumps. Pawns in home cannot be captured.',

  'loading.progress': 'Loading…',
  'common.ok': 'Got it',
  'common.close': 'Close',
};
