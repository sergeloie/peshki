import type { Dictionary } from './index';

/** Russian master strings; the copy source is the #7 copy-review comment. */
export const ru: Dictionary = {
  'app.title': 'Пешки',

  'menu.play': 'Играть',
  'menu.howto': 'Как играть',
  'menu.settings': 'Настройки',

  'game.yourMove': 'Ваш ход',
  'game.yourMoveRoll': 'Ваш ход — бросайте',
  'game.botMove': 'Ход соперника',
  'game.thinking': 'думает…',
  'game.throw': 'Бросить',
  'game.sumHint': '{sum} = {a} + {b}',
  'game.place': 'Выставить',
  'game.placeAndMove': 'Выставить и сходить на {n}',
  'game.usedDice': 'Кубик потрачен',
  'game.noMoves': 'Нет доступных ходов',
  'game.exactCorner': 'Последняя пешка должна встать точно на свой угол — перелёт запрещён.',
  'game.you': 'Вы',
  'game.botName1': 'Оскар',
  'game.botName2': 'Нина',
  'game.botName3': 'Гектор',
  'game.playerN': 'Игрок {n}',
  'game.turns': 'Ход № {n}',
  'game.pause': 'Пауза',

  'pawn.onBench': 'На скамье: {n}',
  'pawn.killed': 'Пешка сбита!',
  'pawn.enteredHome': 'Пешка в доме',

  'pause.resume': 'Продолжить',
  'pause.exit': 'Выйти в меню',
  'exit.confirmTitle': 'Выйти из партии?',
  'exit.confirmText': 'Текущая партия будет потеряна.',
  'exit.yes': 'Выйти',
  'exit.no': 'Остаться',

  'victory.title': 'Победа!',
  'victory.subtitle': {
    one: 'Вы первый. Партия за {n} ход',
    few: 'Вы первый. Партия за {n} хода',
    many: 'Вы первый. Партия за {n} ходов',
    other: 'Вы первый. Партия за {n} хода',
  },
  'defeat.title': 'Поражение',
  'defeat.subtitle': {
    one: 'Победил {name}. Партия за {n} ход',
    few: 'Победил {name}. Партия за {n} хода',
    many: 'Победил {name}. Партия за {n} ходов',
    other: 'Победил {name}. Партия за {n} хода',
  },
  'draw.title': 'Ничья',
  'draw.answers': 'Лимит ходов — победителя нет',
  'result.again': 'Ещё партия',
  'result.menu': 'В меню',

  'settings.title': 'Настройки',
  'settings.sound': 'Звук',
  'settings.language': 'Язык',
  'settings.langRU': 'Русский',
  'settings.langEn': 'English',

  'howto.title': 'Как играть',
  'howto.next': 'Далее',
  'howto.goal.label': 'Цель',
  'howto.goal.text':
    'Проведите все четыре пешки в дом: три — в хвост дома, а последнюю — точно на свой угол. Кто первый — тот и победил.',
  'howto.move.label': 'Движение',
  'howto.move.text':
    'Два кубика — два отдельных хода. Или сложите их: выпало 3 и 4 — сходите на 3, на 4 или на 7.',
  'howto.six.label': 'Шестёрка',
  'howto.six.text':
    'Выпала шестёрка — выставьте пешку со скамьи на свой угол, если он свободен от ваших. Можно выставить и сразу сходить вторым кубиком. Шестёрка или сбитая пешка дают ещё один бросок; шестёрка в нём — ещё один.',
  'howto.kill.label': 'Бой',
  'howto.kill.text':
    'Остановитесь на чужой пешке — она вернётся на скамью. Своя пешка на пути запрещает ход: перепрыгивать нельзя. В доме пешки неуязвимы.',

  'loading.progress': 'Загрузка…',
  'common.ok': 'Понятно',
  'common.close': 'Закрыть',
};
