package ru.anseranser.peshki.output;

import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.List;

public interface OutputService {
    void onEvents(List<GameEvent> events);
    void onGameWon(int playerNumber);
    void onBoard(GameState state);
    String[] snapshotBoard(GameState state);
    void onBoardBeforeAfter(String[] beforeLines, String[] afterLines);
    void onTurnHeader(int turnNumber, int playerNumber, boolean isHuman);
    void onGameEnded(int maxTurns);
}
