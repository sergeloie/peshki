package ru.anseranser.peshki.engine;

import ru.anseranser.peshki.ai.BotStrategy;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;

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
        this.board = new Board(config, diceRoller);
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
            PlayerColor occColor = c.isOccupied()
                    ? PlayerColor.forIndex(c.getOccupantPlayerIndex()) : null;
            return new GameState.CellState(
                    c.getIndex(), xy[0], xy[1], c.getCellType(),
                    c.isOccupied() ? c.getOccupantPlayerIndex() : null,
                    occColor,
                    c.isOccupied() ? c.getOccupantPawnIndex() : null,
                    c.getOwnerPlayerIndex() >= 0 ? c.getOwnerPlayerIndex() : null);
        }).toList();

        List<GameState.PlayerState> players = new ArrayList<>();
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            List<GameState.PawnState> pawns = new ArrayList<>();
            for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
                Pawn pawn = board.getPawn(pi, ppi);
                pawns.add(new GameState.PawnState(
                        ppi,
                        board.deriveState(pi, ppi),
                        pawn.getStepsTraveled(),
                        board.getPawnCell(pi, ppi)));
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
        if (countHomerPawns(playerIndex) != config.numberOfPawns() - 1) return false;

        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (!board.isHome(playerIndex, ppi)) {
                if (board.isBench(playerIndex, ppi)) return false;
                if (board.isNewborn(playerIndex, ppi)) return false;
                return board.getPawnCell(playerIndex, ppi) == board.getCorner(playerIndex).getIndex();
            }
        }
        return false;
    }

    private int countHomerPawns(int playerIndex) {
        return board.countHomerPawns(playerIndex);
    }

    // === Bot turn ===

    public List<GameEvent> executeBotTurn() {
        if (turnNumber >= config.maxTurns()) return List.of();

        List<GameEvent> events = new ArrayList<>();
        List<Integer> dice = new ArrayList<>(currentDice);

        boolean extraTurn = executeBotMoves(currentPlayerIndex, dice, events) || dice.contains(6);

        events.add(new GameEvent.TurnEnded(currentPlayerIndex, extraTurn));

        if (isGameOver()) {
            events.add(new GameEvent.GameWon(currentPlayerIndex));
        }
        advancePlayer(extraTurn);

        eventLog.addAll(events);
        return events;
    }

    private boolean executeBotMoves(int playerIndex, List<Integer> dice, List<GameEvent> events) {
        boolean kickedEnemy = false;
        List<Integer> remainingDice = new ArrayList<>(dice);

        while (!remainingDice.isEmpty()) {
            List<Move> availableMoves = generateAllMoves(playerIndex, remainingDice, board, config);
            if (availableMoves.isEmpty()) break;

            Move bestMove = botStrategy.selectBestMove(playerIndex, availableMoves, config, board);
            if (bestMove == null) break;

            if (bestMove.pawnIndex() == -1) {
                boolean killed = executePlacePawn(playerIndex, 6, events).killed();
                if (bestMove.consumedDice().size() == 2) {
                    int newbornPpi = findNewbornPawnIndex(playerIndex);
                    if (newbornPpi >= 0 && executeMovePawn(playerIndex, newbornPpi, bestMove.steps(), events).killed()) {
                        killed = true;
                    }
                }
                if (killed) kickedEnemy = true;
            } else {
                if (executeMovePawn(playerIndex, bestMove.pawnIndex(), bestMove.steps(), events).killed()) {
                    kickedEnemy = true;
                }
            }

            for (int d : bestMove.consumedDice()) {
                remainingDice.remove(Integer.valueOf(d));
            }

            if (isGameOver()) break;
        }

        return kickedEnemy;
    }

    // === Human command ===

    public List<GameEvent> executeHumanCommand(MoveCommand command) {
        List<GameEvent> events = new ArrayList<>();

        switch (command) {
            case MoveCommand.PlacePawn c -> {
                if (!executePlacePawn(c.playerIndex(), c.diceValue(), events).success()) {
                    events.add(new GameEvent.MoveRejected("Cannot place pawn on corner"));
                }
            }
            case MoveCommand.MovePawn c -> {
                if (!executeMovePawn(c.playerIndex(), c.pawnIndex(), c.steps(), events).success()) {
                    events.add(new GameEvent.MoveRejected(
                            "Cannot move pawn " + c.pawnIndex() + " by " + c.steps()));
                }
            }
            case MoveCommand.PlaceAndMove c -> {
                if (!executePlacePawn(c.playerIndex(), c.placeDice(), events).success()) {
                    events.add(new GameEvent.MoveRejected("Cannot place pawn on corner"));
                } else {
                    int newbornPpi = findNewbornPawnIndex(c.playerIndex());
                    if (newbornPpi < 0 || !executeMovePawn(c.playerIndex(), newbornPpi, c.moveDice(), events).success()) {
                        events.add(new GameEvent.MoveRejected("Cannot move placed pawn"));
                    }
                }
            }
        }

        return events;
    }

    // === Core execution ===

    private record ExecResult(boolean success, boolean killed) {}

    private ExecResult executePlacePawn(int playerIndex, int diceValue, List<GameEvent> events) {
        Cell cornerCell = board.getCorner(playerIndex);

        if (cornerCell.isOccupied() && cornerCell.getOccupantPlayerIndex() == playerIndex) {
            return new ExecResult(false, false);
        }

        List<int[]> benchPawns = board.getBenchPawns(playerIndex);
        if (benchPawns.isEmpty()) {
            return new ExecResult(false, false);
        }

        boolean killed = false;
        if (cornerCell.isOccupied()) {
            int victimPi = cornerCell.getOccupantPlayerIndex();
            int victimPpi = cornerCell.getOccupantPawnIndex();
            events.add(new GameEvent.PawnKilled(
                    playerIndex, benchPawns.getFirst()[0],
                    victimPi, victimPpi));
            board.capturePawn(victimPi, victimPpi);
            killed = true;
        }

        int ppi = benchPawns.getFirst()[0];
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

        if (!board.isHome(playerIndex, pawnIndex) && target.isOccupied()
                && target.getOccupantPlayerIndex() != playerIndex) {
            int victimPi = target.getOccupantPlayerIndex();
            int victimPpi = target.getOccupantPawnIndex();
            events.add(new GameEvent.PawnKilled(
                    playerIndex, pawnIndex,
                    victimPi, victimPpi));
            board.capturePawn(victimPi, victimPpi);
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
        List<Move> moves = new ArrayList<>();
        List<int[]> movablePawns = board.getMovablePawns(playerIndex);

        java.util.Set<Integer> processedDice = new java.util.HashSet<>();
        for (int dieValue : dice) {
            if (!processedDice.add(dieValue)) continue;
            for (int[] ppi : movablePawns) {
                Cell target = board.findTargetCell(playerIndex, ppi[0], dieValue);
                if (target != null) {
                    moves.add(new Move(playerIndex, ppi[0], dieValue,
                            List.of(dieValue), target.getIndex()));
                }
            }
        }

        if (dice.size() == 2) {
            int sum = dice.get(0) + dice.get(1);
            for (int[] ppi : movablePawns) {
                Cell target = board.findTargetCell(playerIndex, ppi[0], sum);
                if (target != null) {
                    moves.add(new Move(playerIndex, ppi[0], sum,
                            List.copyOf(dice), target.getIndex()));
                }
            }
        }

        if (dice.contains(6) && !board.getBenchPawns(playerIndex).isEmpty()) {
            Cell cornerCell = board.getCorner(playerIndex);
            if (!cornerCell.isOccupied() || cornerCell.getOccupantPlayerIndex() != playerIndex) {
                moves.add(new Move(playerIndex, -1, 0, List.of(6), cornerCell.getIndex()));

                List<Integer> otherDice = new ArrayList<>(dice);
                otherDice.remove(Integer.valueOf(6));
                for (int dieValue : otherDice) {
                    Cell target = board.findTargetCellFromCorner(playerIndex, dieValue);
                    if (target != null) {
                        moves.add(new Move(playerIndex, -1, dieValue,
                                List.of(6, dieValue), target.getIndex()));
                    }
                }
            }
        }

        return moves;
    }

    public List<Move> getAvailableMoves() {
        return generateAllMoves(currentPlayerIndex, currentDice, board, config);
    }

    public List<Move> getAvailableMoves(List<Integer> dice) {
        return generateAllMoves(currentPlayerIndex, dice, board, config);
    }
}
