# Console draft — HTML5 «Пешки» (#9)

Ready-to-paste field values for the Yandex Games developer console. Everything here matches the
build (`master` @ `2d3b1ab` + evidence commit); nothing is aspirational. Fields that cannot be
answered from the build say so instead of guessing.

Language pair offered by the game: **ru** and **en**. The title must be identical in the game, in
every draft field and on every promo asset (requirement 5.1.3) — it is `Пешки` in Russian and
`Peshki` in English, which is what the game shows.

## Title

| Field | Value |
|---|---|
| Название (ru) | `Пешки` |
| Name (en) | `Peshki` |

The name carries no word «игра»/«game» (6.5) and is short enough to read on a TV (6.6).

## About the game

**Русский** (198 characters, limit 500):

```
Классическая гонка по деревянной доске в клубном кресле: четыре пешки, два кубика и три
соперника. Сбивайте чужие пешки, считайте шаги и приведите последнюю пешку точно на свой угол.
Одна партия — 10–20 минут.
```

**English** (196 characters):

```
A classic race on a wooden board: four pawns, two dice and three rivals. Capture their pawns,
count your steps and bring the last pawn exactly onto your corner. One match takes 10–20 minutes.
```

Both texts describe the real loop: die-choice movement, captures, exact-corner finish
(requirement 8.2.2).

## How to play

**Русский**:

```
Перед вами классическая «гонка» на деревянной доске. У каждого игрока четыре пешки на скамье,
дом — три ступени и угол. Задача: провести все четыре пешки в дом, а последнюю поставить точно на
свой угол. Кто первый — тот и победил.

Ход: два кубика — два отдельных хода, либо сложите их (выпало 3 и 4 — идите на 3, на 4 или на 7).
Шестёрка позволяет выставить пешку со скамьи на свой угол, если он свободен от ваших пешек.
Остановитесь на чужой пешке — она вернётся на скамью. Своя пешка на пути запрещает ход: прыгать
нельзя. В доме пешки неуязвимы. Шестёрка или сбитая пешка дают ещё один бросок.

Управление: нажмите «Бросить», затем нажмите на подсвеченную клетку или на подсказку хода.
Кнопка паузы — слева от кубиков (портрет) или в левом верхнем углу панели (ландшафт).
Звук и язык — в «Настройках» из меню. На телевизоре: стрелки пульта выбирают «Бросить» и
подсвеченные цели, OK — подтверждает, Back — пауза или закрытие окна.
```

**English**:

```
A classic race on a wooden board. Each player has four pawns on the bench and a home of three
steps plus a corner. Get all four pawns home and land the last one exactly on your own corner.
First player there wins.

A turn: two dice are two separate moves, or add them (3 and 4 — move 3, 4 or 7). A six lets you
place a pawn from the bench onto your own corner, if it is free of your pawns. Stopping on an
opponent's pawn sends it back to the bench. Your own pawn blocks the path — no jumping. Pawns
inside home are safe. A six, or a capture, earns another roll.

Controls: press "Roll", then tap the highlighted cell or the move hint. The pause button sits left
of the dice in portrait and in the top-left corner of the side panel in landscape. Sound and
language live in "Settings" in the menu. On a TV: the remote arrows walk "Roll" and the highlighted
targets, OK confirms, Back opens the pause card or closes the top dialog.
```

This satisfies 2.2 twice: the game carries the same text as four how-to pages plus the
first-match hint card.

## Genre and tags

| Field | Value |
|---|---|
| Категория | Настольные игры (board games) |
| Теги | `настольная игра`, `кубики`, `пешки`, `гонка`, `на двоих`, `против бота`, `браузерная игра`, `board game`, `dice`, `pawns` |

The category is what the game is: a dice-and-pawn board race. Nothing here claims a mechanic the
engine does not have (`web/test/engine/*.test.ts`, 23 numbered scenarios).

## Age rating

**Recommendation: 0+.**

Reasoning against 2.7: no realistic violence (a captured pawn hops back to its bench as a porcelain
figure), no blood, no weapons, no gambling, no purchases, no chat, no user-generated content, no
external links. The conflict is entirely abstract: pawns on a board.

## Supported platforms (the honest list)

The renderer is **PixiJS 8 on WebGL2**. There is no WebGL1 or 2D-canvas fallback, and there is no
"your browser is too old" screen (requirement 1.6.1.7 forbids a WebGL notice, so a browser without
WebGL2 simply shows an empty page). The platform's generic floors — Android 5.0, iOS 9 — predate
usable WebGL2, so they must **not** be declared.

| Class | Declare | Why |
|---|---|---|
| Desktop | ✔ | Yandex Browser, Chrome, Firefox, Opera, Safari 15+ on Windows 10+ and macOS 11+ |
| Mobile web | ✔ | iOS/iPadOS 15+ (WebGL2 since Safari 15), Android 8+ with Chrome 80+ |
| Tablet | ✔ | same as mobile web |
| TV | ✔ | Android TV with a WebGL2-capable browser; the layout reserves 24 px for overscan and the d-pad path is complete |
| Mobile app (Яндекс) | ✔ | same WebView floors as the platform above |

Do **not** declare: Android 5–7 with an old WebView, iOS 9–14, any browser without WebGL2, or
Internet Explorer. If the console offers only broad buckets, pick the narrowest bucket whose floor
is Android 8 / iOS 15 and expect the "does it launch" check to be run in that environment.

## Orientation

| Field | Value |
|---|---|
| Ориентация | Любая (both) |

The layout resolves four aspect classes from one function — `web/test/layout.test.ts` covers ten
viewports from 360×640 to 2560×1440, including square windows, all committed in
`docs/screens/screens-*-{portrait,landscape}.png`.

## Draft flags to tick

| Flag | Value | Note |
|---|---|---|
| Игра использует облачные сохранения | **on** | The game writes through `player.setData(..., true)` (`web/src/platform/ysdk.ts:89-92`); ticking it is requirement 1.11 |
| Реклама | — | **Not connected yet**: requirement 1.12 is unmet, so the build cannot be submitted before the monetization ticket lands |
| Инап-покупки | off | There are no purchases in the code |
| Лидерборды | off | `submitScore` exists in the facade but nothing calls it |

## Promo materials — missing

| Asset | Status |
|---|---|
| Иконка (512×512) | missing — marketing iteration; must not be a screenshot (5.6), no frames or rounded corners (8.3.3) |
| Обложка | missing — same constraints |
| Скриншоты | 32 real-gameplay captures are ready in `docs/screens/screens-*.png`; the console needs the official size set exported from them |
| Видео | not produced, and not required |
| Support e-mail | missing — publisher profile, requirement 6.1 |
| Version | `0.1.0` (`web/package.json`) |

## Texts ready, console not created

The whole §5 block stays open until the draft exists in the console: fields, promo assets and the
unique-name search (5.12) are console-side work. This document is the input for that step, not a
replacement for it.
