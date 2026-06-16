import { Board } from '../engine/Board';
import { Cell, CellType } from '../engine/Cell';
import type { Player } from '../engine/Player';
import { PawnState } from '../engine/Pawn';

const COLORS = ['#e74c3c', '#2ecc71', '#f39c12', '#3498db'];
const BG_COLOR = '#0f3460';
const CELL_COLOR = '#16213e';
const CELL_STROKE = '#444';
const TEXT_COLOR = '#eee';

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly size: number;
  private readonly cellRadius: number;
  private positions: Map<Cell, { x: number; y: number }> = new Map();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.size = canvas.width;
    this.cellRadius = 22;
    this.calculatePositions();
  }

  private calculatePositions(): void {
    this.positions.clear();
    const board = new Board({ sideLength: 8, numberOfPlayers: 4, numberOfPawns: 4, numberOfDice: 2, numberOfSidesOnDice: 6, maxTurns: 5000 });
    const cx = this.size / 2;
    const cy = this.size / 2;
    const fieldR = this.size / 2 - 50;
    const homeR = 30;

    const sortedPlayers = [...board.players].sort((a, b) => a.number - b.number);
    const cornerAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

    for (let i = 0; i < 4; i++) {
      const corner = board.getCorner(sortedPlayers[i]);
      const angle = cornerAngles[i];
      this.positions.set(corner, {
        x: cx + fieldR * Math.cos(angle),
        y: cy + fieldR * Math.sin(angle),
      });
    }
  }

  render(board: Board, selectedPawn: import('../engine/Pawn').Pawn | null = null, validTargets: Cell[] = []): void {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const fieldR = this.size / 2 - 50;
    const homeOffset = 35;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.size, this.size);

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
    const fieldPerSide = 6;
    for (let side = 0; side < 4; side++) {
      const start = cornerPositions[side];
      const end = cornerPositions[(side + 1) % 4];
      for (let j = 1; j <= fieldPerSide; j++) {
        const t = j / (fieldPerSide + 1);
        fieldPositions[side].push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        });
      }
    }

    const homePositions: { x: number; y: number }[][] = [[], [], [], []];
    const homeDirs = [
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
    ];
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
      const corner = board.getCorner(sortedPlayers[i]);
      allPositions.set(corner, cornerPositions[i]);
    }

    const cornerCells = sortedPlayers.map(p => board.getCorner(p));
    for (let side = 0; side < 4; side++) {
      let cell: Cell | null = cornerCells[side];
      for (let j = 0; j < fieldPerSide; j++) {
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

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.cellRadius, 0, Math.PI * 2);
      ctx.fillStyle = isValidTarget ? '#27ae60' : isSelected ? '#8e44ad' : CELL_COLOR;
      ctx.fill();
      ctx.strokeStyle = isValidTarget ? '#2ecc71' : CELL_STROKE;
      ctx.lineWidth = isValidTarget ? 3 : 1;
      ctx.stroke();

      if (cell.pawn) {
        const color = COLORS[cell.pawn.player.number - 1];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.cellRadius - 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.fillStyle = TEXT_COLOR;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(cell.pawn.number), pos.x, pos.y);
      }
    }

    const labels = ['P1', 'P2', 'P3', 'P4'];
    for (let i = 0; i < 4; i++) {
      const cp = cornerPositions[i];
      ctx.fillStyle = COLORS[i];
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], cp.x, cp.y);
    }
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

    const homePositions: { x: number; y: number }[][] = [[], [], [], []];
    const homeDirs = [
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
    ];
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
      const corner = board.getCorner(sortedPlayers[i]);
      allPositions.set(corner, cornerPositions[i]);
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
