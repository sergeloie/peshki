package ru.anseranser.peshki.controller;

import ru.anseranser.peshki.ai.BotStrategy;
import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.MoveSelector;
import ru.anseranser.peshki.engine.TurnPolicy;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.persistence.GameStateSerializer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * UI-agnostic game controller. Owns a {@link GameEngine} and one
 * {@link MoveSelector} per player — humans, bots and future neural nets
 * are interchangeable mid-game via {@link #setController}.
 *
 * <p>Two pacing modes share one apply path in the engine:
 * <ul>
 *   <li>blocking full turn — {@link #playCurrentTurn()} (bots, console humans);</li>
 *   <li>interactive per-move — {@link #submitMove(Move)} (click UIs).</li>
 * </ul>
 * Dice bookkeeping and turn advancement live here, never in UI code.
 *
 * <p>Threading contract: all mutating calls must be invoked from a single
 * owner thread. Listeners are notified synchronously on that same thread.
 */
public class GameSession {

    private final GameEngine engine;
    private final MoveSelector[] controllers;
    private final List<Consumer<GameEvent>> listeners = new CopyOnWriteArrayList<>();
    private List<Integer> remainingDice = List.of();
    private final List<Integer> usedDice = new ArrayList<>();
    private boolean killedThisTurn;

    public GameSession(GameConfig config) {
        this(new GameEngine(config));
    }

    public GameSession(GameEngine engine) {
        this.engine = engine;
        this.controllers = new MoveSelector[engine.getConfig().numberOfPlayers()];
        BotStrategy bot = new BotStrategy();
        for (int i = 0; i < controllers.length; i++) {
            controllers[i] = bot;
        }
    }

    public void addListener(Consumer<GameEvent> listener) {
        listeners.add(listener);
    }

    /**
     * Swaps the controller mid-game: human ↔ bot ↔ neural net.
     *
     * @param human display hint (shown as "(you)" vs "(bot)" in UIs)
     */
    public void setController(int playerIndex, MoveSelector selector, boolean human) {
        controllers[playerIndex] = selector;
        engine.setHuman(playerIndex, human);
    }

    public MoveSelector getController(int playerIndex) {
        return controllers[playerIndex];
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

    /** Dice not yet spent in the current turn (for selectors and UI pacing). */
    public List<Integer> getRemainingDice() {
        return List.copyOf(remainingDice);
    }

    public List<Move> getAvailableMoves() {
        return engine.getAvailableMoves(remainingDice);
    }

    public List<Move> getAvailableMoves(List<Integer> dice) {
        return engine.getAvailableMoves(dice);
    }

    public List<Integer> rollDice() {
        List<Integer> dice = engine.rollDice();
        remainingDice = new ArrayList<>(dice);
        usedDice.clear();
        killedThisTurn = false;
        emit(List.of(new GameEvent.DiceRolled(engine.getCurrentPlayerIndex(), dice)));
        return dice;
    }

    /**
     * Blocking full turn through the current player's controller.
     */
    public List<GameEvent> playCurrentTurn() {
        List<GameEvent> events = engine.playTurn(controllers[engine.getCurrentPlayerIndex()]);
        remainingDice = List.of();
        usedDice.clear();
        killedThisTurn = false;
        emit(events);
        return events;
    }

    /**
     * Interactive single move (click UIs). Validates against the remaining
     * dice, applies through the engine's single apply path, and advances
     * the turn automatically when the dice run out.
     */
    public List<GameEvent> submitMove(Move move) {
        List<GameEvent> events = new ArrayList<>();
        int playerIndex = engine.getCurrentPlayerIndex();

        if (!engine.getAvailableMoves(remainingDice).contains(move)) {
            events.add(new GameEvent.MoveRejected("Move is not available"));
            emit(events);
            return events;
        }

        if (engine.applyMove(move, events)) {
            killedThisTurn = true;
        }
        for (int d : move.consumedDice()) {
            remainingDice.remove(Integer.valueOf(d));
            usedDice.add(d);
        }

        if (engine.isGameOver()) {
            events.add(new GameEvent.GameWon(playerIndex));
        } else if (remainingDice.isEmpty()
                || engine.getAvailableMoves(remainingDice).isEmpty()) {
            boolean extraTurn = TurnPolicy.grantsExtraTurn(
                    engine.getCurrentDice(), killedThisTurn);
            events.add(new GameEvent.TurnEnded(playerIndex, extraTurn));
            engine.advancePlayer(extraTurn);
            remainingDice = List.of();
            usedDice.clear();
            killedThisTurn = false;
        }

        emit(events);
        return events;
    }

    /**
     * Ends the turn when no moves are available at all (e.g. nothing to
     * spend the dice on). No kill could have happened.
     */
    public void skipTurn() {
        int playerIndex = engine.getCurrentPlayerIndex();
        boolean extraTurn = TurnPolicy.grantsExtraTurn(engine.getCurrentDice(), false);
        engine.advancePlayer(extraTurn);
        remainingDice = List.of();
        usedDice.clear();
        killedThisTurn = false;
        emit(List.of(new GameEvent.TurnEnded(playerIndex, extraTurn)));
    }

    /**
     * Completes the current turn and moves to the next player (or grants an
     * extra turn). Retained for manual pacing; the automatic paths
     * ({@link #playCurrentTurn}, {@link #submitMove}) advance on their own.
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
