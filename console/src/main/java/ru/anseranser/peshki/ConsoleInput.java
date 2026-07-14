package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.i18n.Messages;
import ru.anseranser.peshki.input.InputService;
import ru.anseranser.peshki.input.MoveCommand;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class ConsoleInput implements InputService {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    @Override
    public MoveCommand getMove(GameState state, List<Move> availableMoves,
                               List<Integer> allDice, List<Integer> usedDice, GameConfig config) {
        List<Integer> remaining = new ArrayList<>(allDice);
        for (int d : usedDice) remaining.remove(Integer.valueOf(d));

        GameState.PlayerState current = state.players().get(state.currentPlayerIndex());
        int playerIndex = current.playerIndex();
        PlayerColor myColor = current.color();

        System.out.println(Messages.get("prompt.dice", allDice));
        System.out.println(Messages.get("prompt.used", usedDice));
        System.out.println(Messages.get("prompt.left", remaining));
        System.out.println(Messages.get("prompt.moves"));

        List<Move> sorted = new ArrayList<>(availableMoves);
        sorted.sort(Comparator
                .comparingInt(Move::pawnIndex)
                .thenComparingInt(Move::steps));

        for (int i = 0; i < sorted.size(); i++) {
            System.out.println("  " + (i + 1) + ". "
                    + formatMove(state, sorted.get(i), playerIndex, myColor, config));
        }

        int choice = readNumber(1, sorted.size());
        Move selected = sorted.get(choice - 1);

        if (selected.pawnIndex() == -1) {
            if (selected.steps() == 0) {
                return new MoveCommand.PlacePawn(playerIndex, 6);
            } else {
                return new MoveCommand.PlaceAndMove(playerIndex, 6, selected.steps());
            }
        } else {
            return new MoveCommand.MovePawn(playerIndex, selected.pawnIndex(),
                    selected.steps(), selected.consumedDice());
        }
    }

    private String formatMove(GameState state, Move move, int playerIndex,
                               PlayerColor myColor, GameConfig config) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        boolean kill = target.occupantPlayerIndex() != null
                && target.occupantPlayerIndex() != playerIndex;

        if (move.pawnIndex() == -1) {
            if (move.steps() == 0) {
                return kill ? Messages.get("move.placeKill") : Messages.get("move.place");
            }
            return kill ? Messages.get("move.placeMoveKill", move.steps())
                        : Messages.get("move.placeMove", move.steps());
        }

        StringBuilder sb = new StringBuilder();
        sb.append(Messages.get("move.pawn", move.playerIndex(),
                move.pawnIndex(), move.steps()));
        if (kill) sb.append(Messages.get("move.kill"));
        if (target.type() == Cell.CellType.HOME) sb.append(Messages.get("move.home"));
        if (isWinningMove(state, move, playerIndex, config)) sb.append(Messages.get("move.win"));
        return sb.toString();
    }

    private boolean isWinningMove(GameState state, Move move, int playerIndex, GameConfig config) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        if (target.type() != Cell.CellType.CORNER) return false;
        if (target.ownerPlayerIndex() == null || target.ownerPlayerIndex() != playerIndex) return false;
        long homeCount = state.players().stream()
                .filter(p -> p.playerIndex() == playerIndex)
                .findFirst()
                .map(p -> p.pawns().stream()
                        .filter(pw -> pw.state() == Pawn.State.HOMER).count())
                .orElse(0L);
        return homeCount == config.numberOfPawns() - 1;
    }

    private int readNumber(int min, int max) {
        while (true) {
            try {
                System.out.print(Messages.get("prompt.choose"));
                String line = reader.readLine();
                if (line == null) {
                    throw new IllegalStateException(
                            "Console input stream closed (no interactive terminal). " +
                            "Run with an attached console, e.g. `gradlew run --no-daemon`.");
                }
                int num = Integer.parseInt(line.trim());
                if (num >= min && num <= max) return num;
                System.out.println(Messages.get("prompt.range", min, max));
            } catch (NumberFormatException e) {
                System.out.println(Messages.get("prompt.invalid"));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }
}
