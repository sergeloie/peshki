import { Board } from '../engine/Board';
import { Cell, CellType } from '../engine/Cell';
import type { Player } from '../engine/Player';
import { Pawn, PawnState } from '../engine/Pawn';
import { AnimationEngine, easings } from './AnimationEngine';

const COLORS = ['#e88c8c', '#8cc9a8', '#f0c87a', '#8ab4d6'];
const COLORS_LIGHT = ['#f2b8b8', '#b8dfc8', '#f5dda8', '#b0cfe6'];
const COLORS_DARK = ['#c46868', '#6aa888', '#d4a84a', '#6894b6'];
const BG_TOP = '#f5ede3';
const BG_BOTTOM = '#e8ddd0';
const CELL_BASE = '#d4c8b8';
const CELL_LIGHT = '#e2d8cc';
const CELL_STROKE = '#c4b8a8';
const TEXT_COLOR = '#5a5046';
const VALID_COLOR = '#8cc9a8';
const VALID_STROKE = '#6ab88a';
const SELECTED_COLOR = '#c9a8e0';

export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly size: number;
  private readonly cellRadius: number;
  private animEngine: AnimationEngine;

  private animPawnPositions: Map<number, { x: number; y: number; scale: number; alpha: number }> = new Map();
  private wobbleOffsets: Map<number, number> = new Map();
  private glowPhase = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement, animEngine: AnimationEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.size = canvas.width;
    this.cellRadius = 22;
    this.animEngine = animEngine;
  }

  startLoop(): void {
    const loop = (now: number) => {
      this.lastTime = now;
      this.glowPhase = (Math.sin(now / 400) + 1) / 2;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render(board: Board, selectedPawn: Pawn | null = null, validTargets: Cell[] = []): void {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const fieldR = this.size / 2 - 50;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.size * 0.7);
    bgGrad.addColorStop(0, BG_TOP);
    bgGrad.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.size, this.size);

    this.drawWater(ctx, cx, cy);

    ctx.save();
    ctx.shadowColor = 'rgba(80, 60, 40, 0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, fieldR + 30, 0, Math.PI * 2);
    ctx.fillStyle = '#d4e8c8';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, fieldR + 25, 0, Math.PI * 2);
    ctx.fillStyle = '#c8e0b8';
    ctx.fill();

    const sortedPlayers = [...board.players].sort((a, b) => a.number - b.number);
    const cornerAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

    const cornerPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      cornerPositions.push({
        x: cx + fieldR * Math.cos(cornerAngles[i]),
        y: cy + fieldR * Math.sin(cornerAngles[i]),
      });
    }

    const fieldPositions: { x: number; y: number }[][] = [[], [], [], []];
    for (let side = 0; side < 4; side++) {
      const start = cornerPositions[side];
      const end = cornerPositions[(side + 1) % 4];
      for (let j = 1; j <= 6; j++) {
        const t = j / 7;
        fieldPositions[side].push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        });
      }
    }

    const homeDirs = [
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
    ];
    const homeOffset = 35;
    const homePositions: { x: number; y: number }[][] = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      const cp = cornerPositions[i];
      const d = homeDirs[i];
      for (let j = 1; j <= 3; j++) {
        homePositions[i].push({
          x: cp.x + d.dx * homeOffset * j,
          y: cp.y + d.dy * homeOffset * j,
        });
      }
    }

    const allPositions = new Map<Cell, { x: number; y: number }>();
    for (let i = 0; i < 4; i++) {
      allPositions.set(board.getCorner(sortedPlayers[i]), cornerPositions[i]);
    }

    const cornerCells = sortedPlayers.map(p => board.getCorner(p));
    for (let side = 0; side < 4; side++) {
      let cell: Cell | null = cornerCells[side];
      for (let j = 0; j < 6; j++) {
        cell = cell!.nextFieldCell;
        if (cell) allPositions.set(cell, fieldPositions[side][j]);
      }
    }

    for (let i = 0; i < 4; i++) {
      const corner = board.getCorner(sortedPlayers[i]);
      let home = corner.nextHomeCell;
      let idx = 0;
      while (home !== null) {
        allPositions.set(home, homePositions[i][idx]);
        home = home.nextHomeCell;
        idx++;
      }
    }

    for (const [cell, pos] of allPositions) {
      const isValidTarget = validTargets.includes(cell);
      const isSelected = selectedPawn?.cell === cell;
      this.drawCell(ctx, pos.x, pos.y, cell, isValidTarget, isSelected);
    }

    const pawnsOnBoard: { pawn: Pawn; x: number; y: number }[] = [];
    for (const [cell, pos] of allPositions) {
      if (cell.pawn) {
        pawnsOnBoard.push({ pawn: cell.pawn, x: pos.x, y: pos.y });
      }
    }

    for (const { pawn, x, y } of pawnsOnBoard) {
      const wobble = Math.sin(this.lastTime / 800 + pawn.number * 1.5 + pawn.player.number * 2.3) * 1.5;
      this.drawPawn(ctx, x, y + wobble, pawn);
    }

    const labels = ['P1', 'P2', 'P3', 'P4'];
    for (let i = 0; i < 4; i++) {
      const cp = cornerPositions[i];
      ctx.fillStyle = COLORS[i];
      ctx.font = 'bold 14px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], cp.x, cp.y);
    }
  }

  private drawWater(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const time = this.lastTime / 3000;
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 5; i++) {
      const r = this.size * 0.45 + i * 15;
      const offset = Math.sin(time + i) * 3;
      ctx.beginPath();
      ctx.arc(cx + offset, cy + offset * 0.5, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120, 180, 200, ${0.15 - i * 0.02})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cell: Cell,
    isValidTarget: boolean,
    isSelected: boolean,
  ): void {
    const r = this.cellRadius;

    ctx.save();
    ctx.shadowColor = 'rgba(80, 60, 40, 0.12)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r);
    if (isValidTarget) {
      grad.addColorStop(0, '#a8e0b8');
      grad.addColorStop(1, VALID_COLOR);
    } else if (isSelected) {
      grad.addColorStop(0, '#d8c0f0');
      grad.addColorStop(1, SELECTED_COLOR);
    } else {
      grad.addColorStop(0, CELL_LIGHT);
      grad.addColorStop(1, CELL_BASE);
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = isValidTarget ? VALID_STROKE : CELL_STROKE;
    ctx.lineWidth = isValidTarget ? 2.5 : 1;
    ctx.stroke();

    if (isValidTarget) {
      ctx.save();
      ctx.globalAlpha = 0.3 + this.glowPhase * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = VALID_STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPawn(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pawn: Pawn,
  ): void {
    const r = this.cellRadius - 4;
    const colorIdx = pawn.player.number - 1;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.ellipse(x + 1, y + r * 0.3, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(80, 60, 40, 0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;

    const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r);
    grad.addColorStop(0, COLORS_LIGHT[colorIdx]);
    grad.addColorStop(0.7, COLORS[colorIdx]);
    grad.addColorStop(1, COLORS_DARK[colorIdx]);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(pawn.number), x, y + 1);
  }

  getCellAt(x: number, y: number, board: Board): Cell | null {
    const sortedPlayers = [...board.players].sort((a, b) => a.number - b.number);
    const cx = this.size / 2;
    const cy = this.size / 2;
    const fieldR = this.size / 2 - 50;
    const cornerAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const homeOffset = 35;

    const cornerPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      cornerPositions.push({
        x: cx + fieldR * Math.cos(cornerAngles[i]),
        y: cy + fieldR * Math.sin(cornerAngles[i]),
      });
    }

    const fieldPositions: { x: number; y: number }[][] = [[], [], [], []];
    for (let side = 0; side < 4; side++) {
      const start = cornerPositions[side];
      const end = cornerPositions[(side + 1) % 4];
      for (let j = 1; j <= 6; j++) {
        const t = j / 7;
        fieldPositions[side].push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        });
      }
    }

    const homeDirs = [
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
    ];
    const homePositions: { x: number; y: number }[][] = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      const cp = cornerPositions[i];
      const d = homeDirs[i];
      for (let j = 1; j <= 3; j++) {
        homePositions[i].push({
          x: cp.x + d.dx * homeOffset * j,
          y: cp.y + d.dy * homeOffset * j,
        });
      }
    }

    const allPositions = new Map<Cell, { x: number; y: number }>();
    for (let i = 0; i < 4; i++) {
      allPositions.set(board.getCorner(sortedPlayers[i]), cornerPositions[i]);
    }

    const cornerCells = sortedPlayers.map(p => board.getCorner(p));
    for (let side = 0; side < 4; side++) {
      let cell: Cell | null = cornerCells[side];
      for (let j = 0; j < 6; j++) {
        cell = cell!.nextFieldCell;
        if (cell) allPositions.set(cell, fieldPositions[side][j]);
      }
    }

    for (let i = 0; i < 4; i++) {
      const corner = board.getCorner(sortedPlayers[i]);
      let home = corner.nextHomeCell;
      let idx = 0;
      while (home !== null) {
        allPositions.set(home, homePositions[i][idx]);
        home = home.nextHomeCell;
        idx++;
      }
    }

    let closest: Cell | null = null;
    let minDist = Infinity;
    for (const [cell, pos] of allPositions) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.cellRadius + 5 && dist < minDist) {
        minDist = dist;
        closest = cell;
      }
    }
    return closest;
  }
}
