package ru.anseranser.peshki.engine;

import java.util.List;

/**
 * A legal move (ticket 09). Two shapes, no magic indexes:
 * <ul>
 *   <li>{@link Step} — move a pawn already on the board;</li>
 *   <li>{@link Place} — put a bench pawn on the corner ({@code steps == 0}),
 *       optionally previewing the immediate follow-up walk
 *       ({@code steps > 0}, place-and-move).</li>
 * </ul>
 */
public sealed interface Move permits Move.Step, Move.Place {

    int playerIndex();

    List<Integer> consumedDice();

    int targetCellIndex();

    record Step(
            int playerIndex,
            int pawnIndex,
            int steps,
            List<Integer> consumedDice,
            int targetCellIndex
    ) implements Move {}

    record Place(
            int playerIndex,
            int steps,
            List<Integer> consumedDice,
            int targetCellIndex
    ) implements Move {}
}
