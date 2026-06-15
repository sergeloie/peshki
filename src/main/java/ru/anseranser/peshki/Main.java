package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.Player;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.ui.console.ConsoleInput;
import ru.anseranser.peshki.output.OutputService;
import ru.anseranser.peshki.ui.console.ConsoleOutput;

import java.util.List;

public class Main {

    public static void main(String[] args) {
        GameConfig config = GameConfig.DEFAULT;
        GameEngine engine = new GameEngine(config);
        OutputService output = new ConsoleOutput();
        ConsoleInput input = new ConsoleInput();

        int turnCount = 0;
        while (!engine.isGameOver() && turnCount < config.maxTurns()) {
            turnCount++;
            Player currentPlayer = engine.getBoard().getPlayers().get(engine.getCurrentPlayerIndex());

            output.onTurnHeader(turnCount, currentPlayer.getNumber(), currentPlayer.isHuman());

            List<Integer> dice = engine.rollDice();
            output.onEvents(List.of(new GameEvent.DiceRolled(currentPlayer.getNumber(), dice)));

            boolean extraTurn;

            if (currentPlayer.isHuman()) {
                extraTurn = engine.executeHumanTurn(input, output);
            } else {
                String[] beforeLines = output.snapshotBoard(engine.getBoard());
                List<GameEvent> events = engine.executeBotTurn();
                output.onEvents(events);
                extraTurn = events.stream().anyMatch(e ->
                        e instanceof GameEvent.TurnEnded te && te.extraTurn());
                output.onBoardBeforeAfter(beforeLines, output.snapshotBoard(engine.getBoard()));
            }

            if (engine.isGameOver()) {
                output.onBoard(engine.getBoard());
                Player winner = engine.getBoard().getPlayers().get(engine.getCurrentPlayerIndex());
                output.onGameWon(winner.getNumber());
                return;
            }
        }
        output.onGameEnded(config.maxTurns());
    }
}
