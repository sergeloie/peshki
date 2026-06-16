import type { GameConfig } from '../engine/GameConfig';
import { CellType } from '../engine/Cell';
import type { Move } from '../engine/Move';
import { Pawn, PawnState } from '../engine/Pawn';
import type { Player } from '../engine/Player';
import { fieldLength } from '../engine/GameConfig';

export class BotStrategy {
  selectBestMove(player: Player, availableMoves: Move[], config: GameConfig): Move | null {
    return availableMoves.reduce<Move | null>((best, move) => {
      const score = this.scoreMove(player, move, config);
      const bestScore = best ? this.scoreMove(player, best, config) : -Infinity;
      return score > bestScore ? move : best;
    }, null);
  }

  private scoreMove(player: Player, move: Move, config: GameConfig): number {
    if (move.pawn === null) {
      const cornerCell = player.corner;
      const existingPawn = cornerCell.pawn;
      if (existingPawn !== null && existingPawn.player !== player) {
        return 800_000;
      }
      return 100_000;
    }

    const pawn = move.pawn;
    const steps = move.steps;
    const target = pawn.findTargetCell(steps, config);
    if (target === null) return -1;

    const killsEnemy = pawn.state !== PawnState.HOMER
      && target.pawn !== null
      && target.pawn.player !== player;

    const enemy = killsEnemy ? target.pawn!.player : null;

    const entersHome = pawn.state === PawnState.FIELDER
      && target.cellType === CellType.HOME;

    const source = pawn.cell!;
    const onEnemyCorner = source.cellType === CellType.CORNER
      && source.owner !== player;
    const onOwnCorner = source.cellType === CellType.CORNER
      && source.owner === player;

    if (this.isWinningMove(player, pawn, steps, config)) return 1_000_000;
    if (killsEnemy && this.isEnemyLastFieldPawn(enemy!, config)) return 900_000;
    if (killsEnemy) return 800_000;
    if (entersHome) return 700_000;
    if (onEnemyCorner) return 600_000;
    if (onOwnCorner) return 500_000;

    const maxDistance = fieldLength(config);
    const distance = this.calculateDistanceToHome(player, pawn, config);
    return 400_000 + (maxDistance - distance);
  }

  private isWinningMove(player: Player, pawn: Pawn, steps: number, config: GameConfig): boolean {
    if (pawn.state === PawnState.HOMER) return false;
    const target = pawn.findTargetCell(steps, config);
    if (!target || target !== player.corner) return false;
    return player.pawns.filter(p => p !== pawn && p.state === PawnState.HOMER).length === config.numberOfPawns - 1;
  }

  private isEnemyLastFieldPawn(enemy: Player, config: GameConfig): boolean {
    if (!enemy) return false;
    const homeCount = enemy.getPawnsByState(PawnState.HOMER).length;
    const fieldCount = enemy.pawns.filter(p => p.state !== PawnState.HOMER && p.state !== PawnState.BENCH).length;
    return homeCount === config.numberOfPawns - 1 && fieldCount === 1;
  }

  private calculateDistanceToHome(player: Player, pawn: Pawn, config: GameConfig): number {
    if (pawn.state === PawnState.HOMER) return 0;
    let current = pawn.cell!;
    if (current === player.corner) return fieldLength(config);
    let distance = 0;
    while (current !== player.corner && distance < fieldLength(config)) {
      current = current.nextFieldCell!;
      distance++;
    }
    return distance;
  }
}
