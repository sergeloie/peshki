package ru.anseranser.peshki.output;

import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.List;

public interface OutputService {
    void onEvents(List<GameEvent> events);
    void onGameWon(int playerNumber);
    void onBoard(Board board);
    String[] snapshotBoard(Board board);
    void onBoardBeforeAfter(String[] beforeLines, String[] afterLines);
    void onTurnHeader(int turnNumber, int playerNumber, boolean isHuman);
    void onGameEnded(int maxTurns);
}
