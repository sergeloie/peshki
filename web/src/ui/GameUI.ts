import { Cell } from '../engine/Cell';
import { GameEngine } from '../engine/GameEngine';
import type { GameEvent } from '../engine/events/GameEvent';
import { Pawn, PawnState } from '../engine/Pawn';
import type { Player } from '../engine/Player';
import type { Move } from '../engine/Move';
import { MoveCommand } from '../engine/MoveCommand';
import { ThreeRenderer } from './ThreeRenderer';
import { BotStrategy } from '../ai/BotStrategy';

export class GameUI {
  private readonly engine: GameEngine;
  private readonly renderer: ThreeRenderer;
  private readonly panel: HTMLElement;
  private readonly botStrategy = new BotStrategy();

  private selectedPawn: Pawn | null = null;
  private availableMoves: Move[] = [];
  private isProcessing = false;
  private remainingDice: number[] = [];
  private usedDice: number[] = [];
  private hadSixInRoll = false;
  private killedDuringTurn = false;

  constructor(engine: GameEngine, canvas: HTMLCanvasElement, panel: HTMLElement) {
    this.engine = engine;
    this.renderer = new ThreeRenderer(canvas);
    this.panel = panel;

    canvas.addEventListener('click', (e) => this.handleClick(e));

    this.startGame();
  }

  private startGame(): void {
    this.engine.rollDice();
    this.remainingDice = [...this.engine.currentDice];
    this.usedDice = [];
    this.hadSixInRoll = this.engine.currentDice.includes(6);
    this.killedDuringTurn = false;
    this.render();
    this.showTurnInfo();
  }

  private render(): void {
    const validTargets = this.selectedPawn
      ? this.getValidTargets(this.selectedPawn)
      : [];
    this.renderer.render(this.engine.board, this.selectedPawn, validTargets);
    this.renderer.animate();
  }

  private getValidTargets(pawn: Pawn): Cell[] {
    const targets: Cell[] = [];
    const dice = this.remainingDice;

    for (const dieValue of dice) {
      const target = pawn.findTargetCell(dieValue, this.engine.config);
      if (target !== null) {
        targets.push(target);
      }
    }

    if (dice.length === 2) {
      const sum = dice[0] + dice[1];
      const target = pawn.findTargetCell(sum, this.engine.config);
      if (target !== null) {
        targets.push(target);
      }
    }

    return [...new Set(targets)];
  }

  private showTurnInfo(): void {
    const player = this.engine.board.players[this.engine.currentPlayerIndex];
    this.panel.innerHTML = '';

    if (player.isHuman) {
      this.showHumanTurn();
    } else {
      this.showBotTurn();
    }
  }

  private showBotTurn(): void {
    const player = this.engine.board.players[this.engine.currentPlayerIndex];
    const dice = this.engine.currentDice;
    this.panel.innerHTML = '<div style="margin-bottom: 8px; font-weight: bold;">'
      + 'Turn ' + this.engine.turnNumber + ' | Bot ' + player.number + ' is thinking...'
      + ' | Dice: [' + dice.join(', ') + ']'
      + '</div>';
  }

  private getAvailableMoves(player: Player, dice: number[]): Move[] {
    const moves: Move[] = [];
    const movablePawns = player.getMovablePawns();

    for (const dieValue of dice) {
      for (const pawn of movablePawns) {
        const target = pawn.findTargetCell(dieValue, this.engine.config);
        if (target !== null) {
          moves.push({ pawn, steps: dieValue, consumedDice: [dieValue] });
        }
      }
    }

    if (dice.length === 2) {
      const sum = dice[0] + dice[1];
      for (const pawn of movablePawns) {
        const target = pawn.findTargetCell(sum, this.engine.config);
        if (target !== null) {
          moves.push({ pawn, steps: sum, consumedDice: [...dice] });
        }
      }
    }

    if (dice.includes(6) && player.getPawnsByState(PawnState.BENCH).length > 0) {
      const cornerCell = this.engine.board.getCorner(player);
      const existingPawn = cornerCell.pawn;
      if (existingPawn === null || existingPawn.player !== player) {
        moves.push({ pawn: null, steps: 0, consumedDice: [6] });
      }
    }

    return moves;
  }

  private renderMoves(): void {
    const movesEl = document.getElementById('moves');
    if (!movesEl) return;

    const player = this.engine.board.players[this.engine.currentPlayerIndex];

    if (this.availableMoves.length === 0) {
      movesEl.innerHTML = '<div style="color: #aaa;">No available moves</div>';
      setTimeout(() => this.endHumanTurn(), 500);
      return;
    }

    movesEl.innerHTML = this.availableMoves.map((move, i) => {
      const label = this.formatMove(player, move);
      return '<button class="move-btn" data-index="' + i + '" style="'
        + 'display: block; width: 100%; padding: 8px; margin: 4px 0; '
        + 'background: #16213e; color: #eee; border: 1px solid #444; '
        + 'border-radius: 4px; cursor: pointer; text-align: left;'
        + '">' + (i + 1) + '. ' + label + '</button>';
    }).join('');

    movesEl.querySelectorAll('.move-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index')!);
        this.executeMove(this.availableMoves[idx]);
      });
    });
  }

  private formatMove(player: Player, move: Move): string {
    if (move.pawn === null) {
      if (move.steps === 0) {
        const corner = this.engine.board.getCorner(player);
        const kill = corner.pawn && corner.pawn.player !== player;
        return 'Place pawn on corner' + (kill ? ' [KILL!]' : '');
      }
      return 'Place pawn + ' + move.steps + ' steps';
    }

    const pawn = move.pawn;
    const target = pawn.findTargetCell(move.steps, this.engine.config);
    let label = 'Pawn ' + pawn.player.number + '.' + pawn.number + ' -> ' + move.steps + ' steps';

    if (target) {
      if (pawn.state !== PawnState.HOMER && target.pawn && target.pawn.player !== player) {
        label += ' [KILL!]';
      }
      if (pawn.state === PawnState.FIELDER && target.cellType === 'HOME') {
        label += ' [HOME!]';
      }
      const isWin = target === player.corner
        && pawn.state !== PawnState.HOMER
        && player.pawns.filter(p => p !== pawn && p.state === PawnState.HOMER).length === this.engine.config.numberOfPawns - 1;
      if (isWin) {
        label += ' [WIN!]';
      }
    }

    return label;
  }

  private executeMove(move: Move): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    let command: MoveCommand;
    if (move.pawn === null) {
      if (move.steps === 0) {
        command = { type: 'PlacePawn', playerNumber: this.engine.board.players[this.engine.currentPlayerIndex].number, diceValue: 6 };
      } else {
        command = { type: 'PlaceAndMove', playerNumber: this.engine.board.players[this.engine.currentPlayerIndex].number, placeDice: 6, moveDice: move.steps };
      }
    } else {
      command = {
        type: 'MovePawn',
        playerNumber: move.pawn.player.number,
        pawnNumber: move.pawn.number,
        steps: move.steps,
        consumedDice: move.consumedDice,
      };
    }

    const events = this.engine.executeHumanCommand(command, this.usedDice);

    for (const d of move.consumedDice) {
      this.usedDice.push(d);
      const idx = this.remainingDice.indexOf(d);
      if (idx !== -1) this.remainingDice.splice(idx, 1);
    }

    if (events.some(e => e.type === 'PawnKilled')) {
      this.killedDuringTurn = true;
    }

    this.selectedPawn = null;
    this.render();
    this.showEvents(events);

    const isGameOver = this.engine.isGameOver();
    const hasExtraTurn = this.hadSixInRoll || this.killedDuringTurn;

    if (isGameOver) {
      setTimeout(() => this.showGameOver(), 500);
    } else if (this.remainingDice.length > 0) {
      setTimeout(() => {
        this.isProcessing = false;
        this.availableMoves = this.getAvailableMoves(
          this.engine.board.players[this.engine.currentPlayerIndex],
          this.remainingDice,
        );
        this.render();
        this.showHumanTurnWithDice();
      }, 600);
    } else if (hasExtraTurn) {
      setTimeout(() => {
        this.isProcessing = false;
        this.engine.rollDice();
        this.remainingDice = [...this.engine.currentDice];
        this.usedDice = [];
        this.hadSixInRoll = this.engine.currentDice.includes(6);
        this.killedDuringTurn = false;
        this.render();
        this.showTurnInfo();
      }, 800);
    } else {
      setTimeout(() => {
        this.isProcessing = false;
        this.engine.advancePlayer(false);
        this.engine.incrementTurn();
        this.nextTurn();
      }, 800);
    }
  }

  private endHumanTurn(): void {
    this.engine.advancePlayer(false);
    this.engine.incrementTurn();
    this.nextTurn();
  }

  private nextTurn(): void {
    if (this.engine.isGameOver()) {
      this.showGameOver();
      return;
    }

    const player = this.engine.board.players[this.engine.currentPlayerIndex];

    if (player.isHuman) {
      this.engine.rollDice();
      this.remainingDice = [...this.engine.currentDice];
      this.usedDice = [];
      this.hadSixInRoll = this.engine.currentDice.includes(6);
      this.killedDuringTurn = false;
      this.render();
      this.showTurnInfo();
    } else {
      setTimeout(() => this.botTurn(), 500);
    }
  }

  private botTurn(): void {
    this.engine.rollDice();
    const events = this.engine.executeBotTurn();

    this.render();
    this.showBotEvents(events);

    const isGameOver = this.engine.isGameOver();

    if (isGameOver) {
      setTimeout(() => this.showGameOver(), 1200);
    } else {
      const hasExtraTurn = events.some(e => e.type === 'TurnEnded' && e.extraTurn);
      if (hasExtraTurn) {
        setTimeout(() => this.botTurn(), 1200);
      } else {
        setTimeout(() => this.nextTurn(), 1200);
      }
    }
  }

  private showHumanTurn(): void {
    const player = this.engine.board.players[this.engine.currentPlayerIndex];
    const dice = this.engine.currentDice;

    this.availableMoves = this.getAvailableMoves(player, this.remainingDice);

    this.panel.innerHTML = '<div style="margin-bottom: 8px; font-weight: bold;">'
      + 'Your turn (Player ' + player.number + ') | Dice: [' + dice.join(', ') + ']'
      + '</div>'
      + '<div id="moves"></div>';

    this.renderMoves();
  }

  private showHumanTurnWithDice(): void {
    const player = this.engine.board.players[this.engine.currentPlayerIndex];

    this.panel.innerHTML = '<div style="margin-bottom: 8px; font-weight: bold;">'
      + 'Your turn (Player ' + player.number + ') | Remaining: [' + this.remainingDice.join(', ') + ']'
      + '</div>'
      + '<div id="moves"></div>';

    this.renderMoves();
  }

  private showEvents(events: GameEvent[]): void {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;

    const messages = events
      .filter(e => e.type !== 'TurnEnded' && e.type !== 'GameWon')
      .map(e => {
        switch (e.type) {
          case 'DiceRolled':
            return 'Rolled: [' + e.values.join(', ') + ']';
          case 'PawnPlaced':
            return 'Pawn ' + e.playerNumber + '.' + e.pawnNumber + ' placed';
          case 'PawnMoved':
            return 'Pawn ' + e.playerNumber + '.' + e.pawnNumber + ' moved ' + e.steps + ' steps';
          case 'PawnKilled':
            return 'Pawn ' + e.killerPlayer + '.' + e.killerPawn + ' kills ' + e.victimPlayer + '.' + e.victimPawn;
          case 'EnteredHome':
            return 'Pawn ' + e.playerNumber + '.' + e.pawnNumber + ' entered home';
          default:
            return '';
        }
      })
      .filter(m => m);

    if (messages.length > 0) {
      statusEl.innerHTML = messages.map(m => '<div style="color: #aaa;">' + m + '</div>').join('');
    }
  }

  private showBotEvents(events: GameEvent[]): void {
    const messages = events
      .filter(e => e.type !== 'TurnEnded' && e.type !== 'GameWon')
      .map(e => {
        switch (e.type) {
          case 'PawnPlaced':
            return 'Bot ' + e.playerNumber + ': placed pawn';
          case 'PawnMoved':
            return 'Bot ' + e.playerNumber + ': pawn ' + e.pawnNumber + ' -> ' + e.steps + ' steps';
          case 'PawnKilled':
            return 'Bot ' + e.killerPlayer + ': kills ' + e.victimPlayer + '.' + e.victimPawn;
          case 'EnteredHome':
            return 'Bot ' + e.playerNumber + ': pawn ' + e.pawnNumber + ' entered home';
          default:
            return '';
        }
      })
      .filter(m => m);

    const botNum = events[0] && 'playerNumber' in events[0] ? String((events[0] as any).playerNumber) : '';
    this.panel.innerHTML = '<div style="margin-bottom: 8px; font-weight: bold;">'
      + 'Turn ' + this.engine.turnNumber + ' | Bot ' + botNum + ' is moving...'
      + '</div>'
      + messages.map(m => '<div style="color: #aaa;">' + m + '</div>').join('');
  }

  private showGameOver(): void {
    const winner = this.engine.board.players.find(p => {
      const homeCount = p.getPawnsByState(PawnState.HOMER).length;
      if (homeCount !== this.engine.config.numberOfPawns - 1) return false;
      const lastPawn = p.pawns.find(pp => pp.state !== PawnState.HOMER);
      if (!lastPawn || lastPawn.state === PawnState.BENCH || lastPawn.state === PawnState.NEWBORN) return false;
      return lastPawn.cell === this.engine.board.getCorner(p);
    });

    this.panel.innerHTML = '<div style="font-size: 24px; font-weight: bold; color: #f39c12; text-align: center;">'
      + 'Player ' + (winner?.number ?? '?') + ' wins!'
      + '</div>';
  }

  private handleClick(e: MouseEvent): void {
    if (this.isProcessing) return;

    const player = this.engine.board.players[this.engine.currentPlayerIndex];
    if (!player.isHuman) return;

    const cell = this.renderer.getCellAt(e.clientX, e.clientY, this.engine.board);
    if (!cell) return;

    if (cell.pawn && cell.pawn.player === player && cell.pawn.state !== PawnState.BENCH) {
      this.selectedPawn = cell.pawn;
      this.render();
      return;
    }

    if (this.selectedPawn && this.availableMoves.length > 0) {
      const matchingMoves = this.availableMoves.filter(m => {
        if (!m.pawn || m.pawn !== this.selectedPawn) return false;
        const target = m.pawn.findTargetCell(m.steps, this.engine.config);
        return target === cell;
      });

      if (matchingMoves.length > 0) {
        this.executeMove(matchingMoves[0]);
      }
    }
  }
}
