package ru.anseranser.peshki.ui.console;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.i18n.Messages;
import ru.anseranser.peshki.output.OutputService;

import java.util.List;

public class ConsoleOutput implements OutputService {

    @Override
    public void onEvents(List<GameEvent> events) {
        for (GameEvent event : events) {
            switch (event) {
                case GameEvent.DiceRolled e ->
                        System.out.println(Messages.get("event.rolled", e.values()));
                case GameEvent.PawnPlaced e ->
                        System.out.println(Messages.get("event.placed"));
                case GameEvent.PawnMoved e ->
                        System.out.println(Messages.get("event.moved",
                                e.playerNumber(), e.pawnNumber(), e.steps()));
                case GameEvent.PawnKilled e ->
                        System.out.println(Messages.get("event.killed",
                                e.killerPlayer(), e.killerPawn(), e.victimPlayer(), e.victimPawn()));
                case GameEvent.EnteredHome e ->
                        System.out.println(Messages.get("event.enteredHome", e.playerNumber(), e.pawnNumber()));
                case GameEvent.TurnEnded e -> {}
                case GameEvent.GameWon e -> {}
                case GameEvent.MoveRejected e ->
                        System.out.println(Messages.get("event.rejected", e.reason()));
            }
        }
    }

    @Override
    public void onGameWon(int playerNumber) {
        System.out.println(Messages.get("game.won", playerNumber));
    }

    @Override
    public void onBoard(GameState state) {
        String[] lines = BoardRenderer.render(state);
        System.out.println();
        for (String line : lines) {
            System.out.println("  " + line);
        }
        System.out.println();
    }

    @Override
    public String[] snapshotBoard(GameState state) {
        return BoardRenderer.render(state);
    }

    @Override
    public void onBoardBeforeAfter(String[] beforeLines, String[] afterLines) {
        System.out.println(Messages.get("board.before") + " ".repeat(22) + Messages.get("board.after"));
        for (int i = 0; i < Math.min(beforeLines.length, afterLines.length); i++) {
            System.out.println("  " + beforeLines[i] + "    " + afterLines[i]);
        }
        System.out.println();
    }

    @Override
    public void onTurnHeader(int turnNumber, int playerNumber, boolean isHuman) {
        String who = isHuman ? Messages.get("turn.you") : Messages.get("turn.bot");
        System.out.println(Messages.get("turn.header", turnNumber, playerNumber, who));
    }

    @Override
    public void onGameEnded(int maxTurns) {
        System.out.println(Messages.get("game.ended", maxTurns));
    }
}
