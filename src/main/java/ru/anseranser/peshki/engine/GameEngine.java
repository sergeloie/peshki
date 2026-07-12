package ru.anseranser.peshki.engine;

import ru.anseranser.peshki.ai.BotStrategy;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class GameEngine {

    private final GameConfig config;
    private final Board board;
    private final DiceRoller diceRoller;
    private final BotStrategy botStrategy;
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
        board.getPlayers().get(0).setHuman(true);
    }

    public Board getBoard() { return board; }
    public GameConfig getConfig() { return config; }
    public int getTurnNumber() { return turnNumber; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public List<Integer> getCurrentDice() { return currentDice; }
    public List<GameEvent> getEventLog() { return List.copyOf(eventLog); }

    public GameState getState() {
        int[][] coords = BoardLayout.coordinates(board);
        List<GameState.CellState> cells = board.getAllCells().stream().map(c -> {
            int[] xy = coords[c.getIndex()];
            Pawn occ = c.getPawn();
            return new GameState.CellState(
                    c.getIndex(), xy[0], xy[1], c.getCellType(),
                    occ == null ? null : occ.getPlayer().getNumber(),
                    occ == null ? null : occ.getPlayer().getColor(),
                    occ == null ? null : occ.getNumber(),
                    c.getOwner() == null ? null : c.getOwner().getNumber());
        }).toList();

        List<GameState.PlayerState> players = board.getPlayers().stream().map(p ->
                new GameState.PlayerState(p.getNumber(), p.getColor(), p.isHuman(),
                        p.getPawns().stream().map(pw -> new GameState.PawnState(
                                pw.getNumber(), pw.getState(),
                                pw.getCell() == null ? -1 : pw.getCell().getIndex())).toList())
        ).toList();

        boolean over = isGameOver();
        int winner = -1;
        if (over) {
            winner = board.getPlayers().stream()
                    .filter(this::hasWon)
                    .map(Player::getNumber)
                    .findFirst()
                    .orElse(-1);
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
            currentPlayerIndex = (currentPlayerIndex + 1) % board.getPlayers().size();
        }
    }

    public List<Integer> rollDice() {
        Player player = board.getPlayers().get(currentPlayerIndex);
        currentDice = player.rollDice(config);
        return currentDice;
    }

    public boolean isGameOver() {
        return board.getPlayers().stream().anyMatch(this::hasWon);
    }

    private boolean hasWon(Player player) {
        long homeCount = player.getPawns().stream()
                .filter(p -> p.getState() == Pawn.State.HOMER)
                .count();
        if (homeCount != config.numberOfPawns() - 1) return false;

        Pawn lastPawn = player.getPawns().stream()
                .filter(p -> p.getState() != Pawn.State.HOMER)
                .findFirst()
                .orElse(null);

        if (lastPawn == null) return false;
        if (lastPawn.getState() == Pawn.State.BENCH || lastPawn.getState() == Pawn.State.NEWBORN)
            return false;

        return lastPawn.getCell() == board.getCorner(player);
    }

    public List<GameEvent> executeBotTurn() {
        if (turnNumber >= config.maxTurns()) return List.of();

        List<GameEvent> events = new ArrayList<>();

        Player player = board.getPlayers().get(currentPlayerIndex);
        List<Integer> dice = currentDice;

        boolean extraTurn = executeBotMoves(player, dice, events) || dice.contains(6);

        renumberAll();

        events.add(new GameEvent.TurnEnded(player.getNumber(), extraTurn));

        if (isGameOver()) {
            events.add(new GameEvent.GameWon(player.getNumber()));
        }
        advancePlayer(extraTurn);

        eventLog.addAll(events);
        return events;
    }

    public List<GameEvent> executeHumanCommand(MoveCommand command) {
        List<GameEvent> events = new ArrayList<>();
        Player player = board.getPlayers().get(currentPlayerIndex);

        switch (command) {
            case MoveCommand.PlacePawn c -> {
                if (!executePlacePawn(player, c.diceValue(), events).success()) {
                    events.add(new GameEvent.MoveRejected("Cannot place pawn on corner"));
                }
            }
            case MoveCommand.MovePawn c -> {
                if (!executeMovePawn(player, c.pawnNumber(), c.steps(), events).success()) {
                    events.add(new GameEvent.MoveRejected(
                            "Cannot move pawn " + c.pawnNumber() + " by " + c.steps()));
                }
            }
            case MoveCommand.PlaceAndMove c -> {
                if (!executePlacePawn(player, c.placeDice(), events).success()) {
                    events.add(new GameEvent.MoveRejected("Cannot place pawn on corner"));
                } else if (!executeMovePawn(player, findNewbornPawnNumber(player), c.moveDice(), events).success()) {
                    events.add(new GameEvent.MoveRejected("Cannot move placed pawn"));
                }
            }
        }

        renumberAll();
        return events;
    }

    private int findNewbornPawnNumber(Player player) {
        return player.getPawns().stream()
                .filter(p -> p.getState() == Pawn.State.NEWBORN && p.getCell() == board.getCorner(player))
                .findFirst()
                .map(Pawn::getNumber)
                .orElse(1);
    }

    private record ExecResult(boolean success, boolean killed) {}

    private ExecResult executePlacePawn(Player player, int diceValue, List<GameEvent> events) {
        Cell cornerCell = board.getCorner(player);
        Pawn existingPawn = cornerCell.getPawn();

        if (existingPawn != null && existingPawn.getPlayer().equals(player)) {
            return new ExecResult(false, false);
        }

        List<Pawn> benchPawns = player.getPawnsByState(Pawn.State.BENCH);
        if (benchPawns.isEmpty()) {
            return new ExecResult(false, false);
        }

        boolean killed = false;
        if (existingPawn != null) {
            events.add(new GameEvent.PawnKilled(
                    player.getNumber(), benchPawns.getFirst().getNumber(),
                    existingPawn.getPlayer().getNumber(), existingPawn.getNumber()));
            existingPawn.remove();
            killed = true;
        }

        Pawn pawn = benchPawns.getFirst();
        cornerCell.setPawn(pawn);
        pawn.setCell(cornerCell);
        pawn.setState(Pawn.State.NEWBORN);
        events.add(new GameEvent.PawnPlaced(player.getNumber(), pawn.getNumber(), cornerCell.getIndex()));
        return new ExecResult(true, killed);
    }

    private ExecResult executeMovePawn(Player player, int pawnNumber, int steps, List<GameEvent> events) {
        Pawn pawn = player.getPawns().stream()
                .filter(p -> p.getNumber() == pawnNumber)
                .findFirst()
                .orElse(null);
        if (pawn == null || pawn.getState() == Pawn.State.BENCH) return new ExecResult(false, false);

        Cell target = pawn.findTargetCell(steps, config);
        if (target == null) return new ExecResult(false, false);

        int fromIndex = cellIndex(pawn);
        boolean killed = false;

        if (pawn.getState() != Pawn.State.HOMER
                && target.getPawn() != null
                && !target.getPawn().getPlayer().equals(player)) {
            Pawn victim = target.getPawn();
            events.add(new GameEvent.PawnKilled(
                    player.getNumber(), pawn.getNumber(),
                    victim.getPlayer().getNumber(), victim.getNumber()));
            victim.remove();
            killed = true;
        }

        pawn.moveTo(target);

        events.add(new GameEvent.PawnMoved(
                player.getNumber(), pawn.getNumber(), fromIndex, cellIndex(pawn), steps));

        if (pawn.getState() == Pawn.State.HOMER) {
            events.add(new GameEvent.EnteredHome(player.getNumber(), pawn.getNumber()));
        }
        return new ExecResult(true, killed);
    }

    private boolean executeBotMoves(Player player, List<Integer> dice, List<GameEvent> events) {
        boolean kickedEnemy = false;
        List<Integer> remainingDice = new ArrayList<>(dice);

        while (!remainingDice.isEmpty()) {
            List<Move> availableMoves = generateAllMoves(player, remainingDice, board, config);
            if (availableMoves.isEmpty()) break;

            Move bestMove = botStrategy.selectBestMove(player, availableMoves, config);
            if (bestMove == null) break;

            if (bestMove.pawn() == null) {
                boolean killed = executePlacePawn(player, 6, events).killed();
                if (bestMove.consumedDice().size() == 2) {
                    if (executeMovePawn(player, findNewbornPawnNumber(player), bestMove.steps(), events).killed()) {
                        killed = true;
                    }
                }
                if (killed) kickedEnemy = true;
            } else {
                Cell target = bestMove.pawn().findTargetCell(bestMove.steps(), config);
                if (target == null) break;

                if (executeMovePawn(player, bestMove.pawn().getNumber(), bestMove.steps(), events).killed()) {
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

    public static List<Move> generateAllMoves(Player player, List<Integer> dice, Board board, GameConfig config) {
        List<Move> moves = new ArrayList<>();
        List<Pawn> movablePawns = player.getMovablePawns();

        for (int dieValue : dice) {
            for (Pawn pawn : movablePawns) {
                Cell target = pawn.findTargetCell(dieValue, config);
                if (target != null) {
                    moves.add(new Move(pawn, dieValue, List.of(dieValue), target.getIndex()));
                }
            }
        }

        if (dice.size() == 2) {
            int sum = dice.get(0) + dice.get(1);
            for (Pawn pawn : movablePawns) {
                Cell target = pawn.findTargetCell(sum, config);
                if (target != null) {
                    moves.add(new Move(pawn, sum, List.copyOf(dice), target.getIndex()));
                }
            }
        }

        if (dice.contains(6) && !player.getPawnsByState(Pawn.State.BENCH).isEmpty()) {
            Cell cornerCell = board.getCorner(player);
            Pawn existingPawn = cornerCell.getPawn();
            if (existingPawn == null || !existingPawn.getPlayer().equals(player)) {
                int cornerIdx = cornerCell.getIndex();
                moves.add(new Move(null, 0, List.of(6), cornerIdx));

                List<Integer> otherDice = new ArrayList<>(dice);
                otherDice.remove(Integer.valueOf(6));
                for (int dieValue : otherDice) {
                    if (canPlaceAndMove(player, dieValue, board, config)) {
                        moves.add(new Move(null, dieValue, List.of(6, dieValue),
                                cornerTargetIndex(player, dieValue, board)));
                    }
                }
            }
        }

        return moves;
    }

    private static int cornerTargetIndex(Player player, int steps, Board board) {
        Cell current = board.getCorner(player);
        for (int i = 0; i < steps; i++) {
            Cell next = current.getNextFieldCell();
            if (next == null) return -1;
            current = next;
        }
        return current.getIndex();
    }

    public List<Move> getAvailableMoves() {
        return generateAllMoves(board.getPlayers().get(currentPlayerIndex), currentDice, board, config);
    }

    public List<Move> getAvailableMoves(List<Integer> dice) {
        return generateAllMoves(board.getPlayers().get(currentPlayerIndex), dice, board, config);
    }

    private static boolean canPlaceAndMove(Player player, int steps, Board board, GameConfig config) {
        Cell current = board.getCorner(player);
        for (int i = 0; i < steps; i++) {
            Cell next = current.getNextFieldCell();
            if (next == null) return false;
            if (i < steps - 1 && next.getPawn() != null) return false;
            if (i == steps - 1 && next.getPawn() != null
                    && next.getPawn().getPlayer().equals(player)) return false;
            current = next;
        }
        return true;
    }

    private void renumberAll() {
        board.getPlayers().forEach(Player::renumber);
    }

    private int cellIndex(Pawn pawn) {
        return pawn.getCell() == null ? -1 : pawn.getCell().getIndex();
    }
}
