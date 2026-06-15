package ru.anseranser.peshki.output;

import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.engine.GameState;

import java.util.List;

public interface OutputService {
    void onGameState(GameState state);
    void onEvents(List<GameEvent> events);
    void onGameWon(int playerNumber);
    void onBoard(Board board);
    void onBoardBeforeAfter(Board before, Board after);
    void onTurnHeader(int turnNumber, int playerNumber, boolean isHuman);
    void onGameEnded(int maxTurns);
}
