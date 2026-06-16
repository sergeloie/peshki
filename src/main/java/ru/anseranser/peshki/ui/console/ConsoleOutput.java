package ru.anseranser.peshki.ui.console;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.output.OutputService;

import java.util.List;

public class ConsoleOutput implements OutputService {

    @Override
    public void onEvents(List<GameEvent> events) {
        for (GameEvent event : events) {
            switch (event) {
                case GameEvent.DiceRolled e ->
                        System.out.println("  Rolled: " + e.values());
                case GameEvent.PawnPlaced e ->
                        System.out.println("  Placed new pawn on corner");
                case GameEvent.PawnMoved e ->
                        System.out.println("  Pawn " + e.playerNumber() + "." + e.pawnNumber()
                                + " moved " + e.steps() + " steps");
                case GameEvent.PawnKilled e ->
                        System.out.println("  Pawn " + e.killerPlayer() + "." + e.killerPawn()
                                + " killed " + e.victimPlayer() + "." + e.victimPawn());
                case GameEvent.EnteredHome e ->
                        System.out.println("  Pawn " + e.playerNumber() + "." + e.pawnNumber() + " entered home");
                case GameEvent.TurnEnded e -> {}
                case GameEvent.GameWon e -> {}
                case GameEvent.MoveRejected e ->
                        System.out.println("  Move rejected: " + e.reason());
            }
        }
    }

    @Override
    public void onGameWon(int playerNumber) {
        System.out.println("Player " + playerNumber + " wins!");
    }

    @Override
    public void onBoard(Board board) {
        String[] lines = BoardRenderer.render(board);
        System.out.println();
        for (String line : lines) {
            System.out.println("  " + line);
        }
        System.out.println();
    }

    @Override
    public String[] snapshotBoard(Board board) {
        return BoardRenderer.render(board);
    }

    @Override
    public void onBoardBeforeAfter(String[] beforeLines, String[] afterLines) {
        System.out.println("  BEFORE" + " ".repeat(22) + "AFTER");
        for (int i = 0; i < Math.min(beforeLines.length, afterLines.length); i++) {
            System.out.println("  " + beforeLines[i] + "    " + afterLines[i]);
        }
        System.out.println();
    }

    @Override
    public void onTurnHeader(int turnNumber, int playerNumber, boolean isHuman) {
        System.out.println("=== Turn " + turnNumber + " | Player " + playerNumber
                + (isHuman ? " (YOU)" : " (BOT)") + " ===");
    }

    @Override
    public void onGameEnded(int maxTurns) {
        System.out.println("Game ended after " + maxTurns + " turns.");
    }
}
