package ru.anseranser.peshki.engine;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates every legal move for a dice roll (ticket 07).
 * Pure function of board + dice; owns no turn state.
 */
public final class MoveGenerator {

    private MoveGenerator() {}

    public static List<Move> generate(Board board, int playerIndex, List<Integer> dice) {
        DiceSet set = new DiceSet(dice);
        List<Move> moves = new ArrayList<>();
        List<PawnId> movablePawns = board.getMovablePawns(playerIndex);

        for (int dieValue : set.distinctValues()) {
            for (PawnId id : movablePawns) {
                Cell target = board.findTargetCell(playerIndex, id.pawnIndex(), dieValue);
                if (target != null) {
                    moves.add(new Move.Step(playerIndex, id.pawnIndex(), dieValue,
                            List.of(dieValue), target.getIndex()));
                }
            }
        }

        if (set.hasPairSum()) {
            int sum = set.pairSum();
            for (PawnId id : movablePawns) {
                Cell target = board.findTargetCell(playerIndex, id.pawnIndex(), sum);
                if (target != null) {
                    moves.add(new Move.Step(playerIndex, id.pawnIndex(), sum,
                            List.copyOf(set.values()), target.getIndex()));
                }
            }
        }

        if (set.contains(6) && !board.getBenchPawns(playerIndex).isEmpty()) {
            Cell cornerCell = board.getCorner(playerIndex);
            int[] occ = board.getPosition().occupantAt(cornerCell.getIndex());
            if (occ == null || occ[0] != playerIndex) {
                moves.add(new Move.Place(playerIndex, 0, List.of(6), cornerCell.getIndex()));

                for (int dieValue : set.withoutOne(6)) {
                    Cell target = board.findTargetCellFromCorner(playerIndex, dieValue);
                    if (target != null) {
                        moves.add(new Move.Place(playerIndex, dieValue,
                                List.of(6, dieValue), target.getIndex()));
                    }
                }
            }
        }

        return moves;
    }
}
