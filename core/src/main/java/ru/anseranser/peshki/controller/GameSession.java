package ru.anseranser.peshki.controller;

import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;
import ru.anseranser.peshki.persistence.GameStateSerializer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * UI-agnostic game controller. Owns a {@link GameEngine} and drives it through
 * explicit commands, emitting {@link GameEvent}s to registered listeners.
 *
 * <p>Threading contract: all mutating calls ({@link #rollDice()},
 * {@link #submitMove}, {@link #playBotTurn}) must be invoked from a single
 * owner thread (typically the UI/controller thread). Listeners are notified
 * synchronously on that same thread. Long-running bot turns should be
 * dispatched on a background thread by the owner, never inside this class.
 */
public class GameSession {

    private final GameEngine engine;
    private final List<Consumer<GameEvent>> listeners = new CopyOnWriteArrayList<>();

    public GameSession(GameConfig config) {
        this(new GameEngine(config));
    }

    public GameSession(GameEngine engine) {
        this.engine = engine;
    }

    public void addListener(Consumer<GameEvent> listener) {
        listeners.add(listener);
    }

    public GameState getState() {
        return engine.getState();
    }

    public GameEngine getEngine() {
        return engine;
    }

    public boolean isGameOver() {
        return engine.isGameOver();
    }

    public int getCurrentPlayerIndex() {
        return engine.getCurrentPlayerIndex();
    }

    public List<Integer> getCurrentDice() {
        return engine.getCurrentDice();
    }

    public List<Move> getAvailableMoves() {
        return engine.getAvailableMoves();
    }

    public List<Move> getAvailableMoves(List<Integer> dice) {
        return engine.getAvailableMoves(dice);
    }

    public List<Integer> rollDice() {
        List<Integer> dice = engine.rollDice();
        int playerNumber = engine.getBoard().getPlayers().get(engine.getCurrentPlayerIndex()).getNumber();
        emit(List.of(new GameEvent.DiceRolled(playerNumber, dice)));
        return dice;
    }

    public List<GameEvent> submitMove(MoveCommand command) {
        List<GameEvent> events = engine.executeHumanCommand(command);
        emit(events);
        return events;
    }

    public List<GameEvent> playBotTurn() {
        List<GameEvent> events = engine.executeBotTurn();
        emit(events);
        return events;
    }

    /**
     * Completes the current turn and moves to the next player (or grants an
     * extra turn). The UI must call this after a human turn ends — the engine
     * does not advance automatically for human moves, mirroring the bot path
     * which advances internally. Exposing it here keeps the controller the
     * single boundary a UI talks to (no need to reach into {@link GameEngine}).
     *
     * @param extraTurn true if the player earned another turn (rolled a 6 or
     *                  made a kill); in that case the same player stays on turn
     */
    public void advancePlayer(boolean extraTurn) {
        engine.advancePlayer(extraTurn);
    }

    private void emit(List<GameEvent> events) {
        for (GameEvent e : events) {
            for (Consumer<GameEvent> listener : listeners) {
                listener.accept(e);
            }
        }
    }

    /**
     * Persists the current game to a JSON file so it can be resumed later
     * (save/load for mobile/desktop clients).
     */
    public void saveToFile(Path path) {
        try {
            Files.writeString(path, GameStateSerializer.toJson(engine.snapshotState()));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to save game to " + path, e);
        }
    }

    /**
     * Loads a previously saved game from a JSON file and returns a fresh
     * {@link GameSession} wrapping the restored engine.
     */
    public static GameSession loadFromFile(Path path) {
        try {
            String json = Files.readString(path);
            GameState state = GameStateSerializer.fromJson(json);
            return new GameSession(GameEngine.fromState(state));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load game from " + path, e);
        }
    }
}
