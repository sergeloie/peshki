package ru.anseranser.peshki.engine;

import ru.anseranser.peshki.ai.BotStrategy;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Stream;

public class GameEngine {

    private final GameConfig config;
    private final Board board;
    private final DiceRoller diceRoller;
    private final BotStrategy botStrategy;
    private final boolean[] humanFlags;
    private final List<GameEvent> eventLog = new ArrayList<>();
    private int currentPlayerIndex = 0;
    private int turnNumber = 0;
    private List<Integer> currentDice = List.of();

    public GameEngine(GameConfig config) {
        this(config, new RandomDiceRoller(new Random()), new BotStrategy());
    }

    public GameEngine(GameConfig config, DiceRoller diceRoller) {
        this(config, diceRoller, new BotStrategy());
    }

    public GameEngine(GameConfig config, DiceRoller diceRoller, BotStrategy botStrategy) {
        this.config = config;
        this.diceRoller = diceRoller;
        this.botStrategy = botStrategy;
        this.board = new Board(config);
        this.humanFlags = new boolean[config.numberOfPlayers()];
        humanFlags[0] = true;
    }

    public Board getBoard() { return board; }
    public GameConfig getConfig() { return config; }
    public int getTurnNumber() { return turnNumber; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public List<Integer> getCurrentDice() { return currentDice; }
    public List<GameEvent> getEventLog() { return List.copyOf(eventLog); }
    public boolean isHuman(int playerIndex) { return humanFlags[playerIndex]; }
    public void setHuman(int playerIndex, boolean human) { humanFlags[playerIndex] = human; }

    public GameState getState() {
        int[][] coords = BoardLayout.coordinates(board);
        List<GameState.CellState> cells = board.getAllCells().stream().map(c -> {
            int[] xy = coords[c.getIndex()];
            int[] occ = board.getPosition().occupantAt(c.getIndex());
            PlayerColor occColor = occ != null
                    ? PlayerColor.forIndex(occ[0]) : null;
            return new GameState.CellState(
                    c.getIndex(), xy[0], xy[1], c.getCellType(),
                    occ != null ? occ[0] : null,
                    occColor,
                    occ != null ? occ[1] : null,
                    c.getOwnerPlayerIndex() >= 0 ? c.getOwnerPlayerIndex() : null);
        }).toList();

        List<GameState.PlayerState> players = new ArrayList<>();
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            List<GameState.PawnState> pawns = new ArrayList<>();
            for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
                pawns.add(new GameState.PawnState(
                        ppi,
                        board.deriveState(pi, ppi),
                        board.getPosition().hasMoved(pi, ppi) ? 1 : 0,
                        board.getPawnCell(pi, ppi),
                        board.pawnProgress(pi, ppi)));
            }
            players.add(new GameState.PlayerState(
                    pi, PlayerColor.forIndex(pi), humanFlags[pi], pawns));
        }

        boolean over = isGameOver();
        int winner = -1;
        if (over) {
            for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
                if (hasWon(pi)) { winner = pi; break; }
            }
        }
        return new GameState(config, currentPlayerIndex, currentDice, turnNumber, over, winner, players, cells);
    }

    public GameState snapshotState() {
        return getState();
    }

    public void restoreState(GameState state) {
        this.currentPlayerIndex = state.currentPlayerIndex();
        this.currentDice = List.copyOf(state.currentDice());
        this.turnNumber = state.turnNumber();
        this.eventLog.clear();
        for (GameState.PlayerState ps : state.players()) {
            humanFlags[ps.playerIndex()] = ps.human();
        }
        board.restore(state);
    }

    public static GameEngine fromState(GameState state) {
        GameEngine engine = new GameEngine(state.config());
        engine.restoreState(state);
        return engine;
    }

    public void advancePlayer(boolean extraTurn) {
        if (!isGameOver()) {
            turnNumber++;
        }
        if (!extraTurn && !isGameOver()) {
            currentPlayerIndex = (currentPlayerIndex + 1) % config.numberOfPlayers();
        }
    }

    public List<Integer> rollDice() {
        currentDice = Stream.generate(() -> diceRoller.roll(config.numberOfSidesOnDice()))
                .limit(config.numberOfDice())
                .toList();
        return currentDice;
    }

    public boolean isGameOver() {
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            if (hasWon(pi)) return true;
        }
        return false;
    }

    private boolean hasWon(int playerIndex) {
        return WinChecker.hasWon(board, playerIndex);
    }

    // === Turn execution: one path for every controller ===

    public List<GameEvent> executeBotTurn() {
        return playTurn(botStrategy);
    }

    public List<GameEvent> playTurn(MoveSelector selector) {
        if (turnNumber >= config.maxTurns()) return List.of();

        List<GameEvent> events = new ArrayList<>();
        List<Integer> dice = new ArrayList<>(currentDice);
        List<Integer> remainingDice = new ArrayList<>(dice);
        boolean kickedEnemy = false;

        while (!remainingDice.isEmpty() && !isGameOver()) {
            List<Move> legalMoves = generateAllMoves(
                    currentPlayerIndex, remainingDice, board, config);
            if (legalMoves.isEmpty()) break;

            MoveContext context = new MoveContext(getState(),
                    PositionView.snapshot(board),
                    new DiceSet(dice), List.copyOf(remainingDice));
            Move chosen = selector.select(context, legalMoves);
            if (chosen == null) break;
            if (!legalMoves.contains(chosen)) {
                events.add(new GameEvent.MoveRejected("Illegal move selected"));
                break;
            }

            if (applyMove(chosen, events)) {
                kickedEnemy = true;
            }
            for (int d : chosen.consumedDice()) {
                remainingDice.remove(Integer.valueOf(d));
            }
        }

        boolean extraTurn = TurnPolicy.grantsExtraTurn(dice, kickedEnemy);
        events.add(new GameEvent.TurnEnded(currentPlayerIndex, extraTurn));

        if (isGameOver()) {
            events.add(new GameEvent.GameWon(currentPlayerIndex));
        }
        advancePlayer(extraTurn);

        eventLog.addAll(events);
        return events;
    }

    /**
     * Applies a single legal move. Shared by full-turn ({@link #playTurn})
     * and interactive per-move pacing — the one apply path.
     *
     * @return true when the move killed an enemy pawn
     */
    public boolean applyMove(Move move, List<GameEvent> events) {
        return switch (move) {
            case Move.Place p -> {
                boolean killed = executePlacePawn(p.playerIndex(), 6, events).killed();
                if (p.consumedDice().size() == 2) {
                    int newbornPpi = findNewbornPawnIndex(p.playerIndex());
                    if (newbornPpi >= 0 && executeMovePawn(
                            p.playerIndex(), newbornPpi, p.steps(), events).killed()) {
                        killed = true;
                    }
                }
                yield killed;
            }
            case Move.Step s -> executeMovePawn(
                    s.playerIndex(), s.pawnIndex(), s.steps(), events).killed();
        };
    }

    // === Core execution ===

    private record ExecResult(boolean success, boolean killed) {}

    private ExecResult executePlacePawn(int playerIndex, int diceValue, List<GameEvent> events) {
        Cell cornerCell = board.getCorner(playerIndex);
        int[] occ = board.getPosition().occupantAt(cornerCell.getIndex());

        if (occ != null && occ[0] == playerIndex) {
            return new ExecResult(false, false);
        }

        List<PawnId> benchPawns = board.getBenchPawns(playerIndex);
        if (benchPawns.isEmpty()) {
            return new ExecResult(false, false);
        }

        boolean killed = false;
        if (occ != null) {
            events.add(new GameEvent.PawnKilled(
                    playerIndex, benchPawns.getFirst().pawnIndex(),
                    occ[0], occ[1]));
            board.capturePawn(occ[0], occ[1]);
            killed = true;
        }

        int ppi = benchPawns.getFirst().pawnIndex();
        board.placePawn(playerIndex, ppi, cornerCell);
        events.add(new GameEvent.PawnPlaced(playerIndex, ppi, cornerCell.getIndex()));
        return new ExecResult(true, killed);
    }

    private ExecResult executeMovePawn(int playerIndex, int pawnIndex, int steps, List<GameEvent> events) {
        if (board.isBench(playerIndex, pawnIndex)) return new ExecResult(false, false);

        Cell target = board.findTargetCell(playerIndex, pawnIndex, steps);
        if (target == null) return new ExecResult(false, false);

        int fromIndex = board.getPawnCell(playerIndex, pawnIndex);
        boolean killed = false;

        int[] occ = board.getPosition().occupantAt(target.getIndex());
        if (!board.isHome(playerIndex, pawnIndex) && occ != null
                && occ[0] != playerIndex) {
            events.add(new GameEvent.PawnKilled(
                    playerIndex, pawnIndex,
                    occ[0], occ[1]));
            board.capturePawn(occ[0], occ[1]);
            killed = true;
        }

        board.movePawn(playerIndex, pawnIndex, target);

        events.add(new GameEvent.PawnMoved(
                playerIndex, pawnIndex, fromIndex, target.getIndex(), steps));

        if (board.isHome(playerIndex, pawnIndex)) {
            events.add(new GameEvent.EnteredHome(playerIndex, pawnIndex));
        }
        return new ExecResult(true, killed);
    }

    private int findNewbornPawnIndex(int playerIndex) {
        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (board.isNewborn(playerIndex, ppi)) return ppi;
        }
        return -1;
    }

    // === Move generation ===

    public static List<Move> generateAllMoves(int playerIndex, List<Integer> dice, Board board, GameConfig config) {
        return MoveGenerator.generate(board, playerIndex, dice);
    }

    public List<Move> getAvailableMoves() {
        return generateAllMoves(currentPlayerIndex, currentDice, board, config);
    }

    public List<Move> getAvailableMoves(List<Integer> dice) {
        return generateAllMoves(currentPlayerIndex, dice, board, config);
    }
}
