package ru.anseranser.peshki.ui.console;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.i18n.Messages;
import ru.anseranser.peshki.input.InputService;
import ru.anseranser.peshki.input.MoveCommand;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class ConsoleInput implements InputService {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    @Override
    public MoveCommand getMove(GameState state, List<Move> availableMoves,
                               List<Integer> allDice, List<Integer> usedDice, GameConfig config) {
        List<Integer> remaining = new ArrayList<>(allDice);
        for (int d : usedDice) remaining.remove(Integer.valueOf(d));

        GameState.PlayerState current = state.players().get(state.currentPlayerIndex());
        int playerNumber = current.number();
        PlayerColor myColor = current.color();

        System.out.println(Messages.get("prompt.dice", allDice));
        System.out.println(Messages.get("prompt.used", usedDice));
        System.out.println(Messages.get("prompt.left", remaining));
        System.out.println(Messages.get("prompt.moves"));

        for (int i = 0; i < availableMoves.size(); i++) {
            System.out.println("  " + (i + 1) + ". "
                    + formatMove(state, availableMoves.get(i), playerNumber, myColor, config));
        }

        int choice = readNumber(1, availableMoves.size());
        Move selected = availableMoves.get(choice - 1);

        if (selected.pawn() == null) {
            if (selected.steps() == 0) {
                return new MoveCommand.PlacePawn(playerNumber, 6);
            } else {
                return new MoveCommand.PlaceAndMove(playerNumber, 6, selected.steps());
            }
        } else {
            return new MoveCommand.MovePawn(playerNumber, selected.pawn().getNumber(),
                    selected.steps(), selected.consumedDice());
        }
    }

    private String formatMove(GameState state, Move move, int playerNumber,
                               PlayerColor myColor, GameConfig config) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        boolean kill = target.occupantPlayerNumber() != null
                && target.occupantPlayerNumber() != playerNumber;

        if (move.pawn() == null) {
            if (move.steps() == 0) {
                return kill ? Messages.get("move.placeKill") : Messages.get("move.place");
            }
            return kill ? Messages.get("move.placeMoveKill", move.steps())
                        : Messages.get("move.placeMove", move.steps());
        }

        StringBuilder sb = new StringBuilder();
        sb.append(Messages.get("move.pawn", move.pawn().getPlayer().getNumber(),
                move.pawn().getNumber(), move.steps()));
        if (kill) sb.append(Messages.get("move.kill"));
        if (target.type() == Cell.CellType.HOME) sb.append(Messages.get("move.home"));
        if (isWinningMove(state, move, playerNumber, config)) sb.append(Messages.get("move.win"));
        return sb.toString();
    }

    private boolean isWinningMove(GameState state, Move move, int playerNumber, GameConfig config) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        if (target.type() != Cell.CellType.CORNER) return false;
        if (target.ownerPlayerNumber() == null || target.ownerPlayerNumber() != playerNumber) return false;
        long homeCount = state.players().stream()
                .filter(p -> p.number() == playerNumber)
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
