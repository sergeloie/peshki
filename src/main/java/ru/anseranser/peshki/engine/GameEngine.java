package ru.anseranser.peshki.engine;

import ru.anseranser.peshki.ai.BotStrategy;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;

import java.util.ArrayList;
import java.util.List;

public class GameEngine {

    private final GameConfig config;
    private final Board board;
    private final List<GameEvent> eventLog = new ArrayList<>();
    private int currentPlayerIndex = 0;
    private int turnNumber = 0;
    private List<Integer> currentDice = List.of();
    private final BotStrategy botStrategy = new BotStrategy();

    public GameEngine(GameConfig config) {
        this.config = config;
        this.board = new Board(config);
        board.getPlayers().get(0).setHuman(true);
    }

    public Board getBoard() { return board; }
    public GameConfig getConfig() { return config; }
    public int getTurnNumber() { return turnNumber; }
    public int getCurrentPlayerIndex() { return currentPlayerIndex; }
    public List<Integer> getCurrentDice() { return currentDice; }
    public List<GameEvent> getEventLog() { return List.copyOf(eventLog); }

    public void advancePlayer(boolean extraTurn) {
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

        turnNumber++;
        List<GameEvent> events = new ArrayList<>();

        Player player = board.getPlayers().get(currentPlayerIndex);
        List<Integer> dice = currentDice;

        boolean extraTurn = executeBotMoves(player, dice, events);

        renumberAll();

        events.add(new GameEvent.TurnEnded(player.getNumber(), extraTurn));

        if (isGameOver()) {
            events.add(new GameEvent.GameWon(player.getNumber()));
        } else if (!extraTurn) {
            currentPlayerIndex = (currentPlayerIndex + 1) % board.getPlayers().size();
        }

        eventLog.addAll(events);
        return events;
    }

    public void incrementTurn() {
        turnNumber++;
    }

    public List<GameEvent> executeHumanCommand(MoveCommand command, List<Integer> usedDice) {
        List<GameEvent> events = new ArrayList<>();
        Player player = board.getPlayers().get(currentPlayerIndex);

        switch (command) {
            case MoveCommand.PlacePawn c -> executePlacePawn(player, c.diceValue(), events);
            case MoveCommand.MovePawn c -> executeMovePawn(player, c.pawnNumber(), c.steps(), events);
            case MoveCommand.PlaceAndMove c -> {
                executePlacePawn(player, c.placeDice(), events);
                executeMovePawn(player, findNewbornPawnNumber(player), c.moveDice(), events);
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

    private void executePlacePawn(Player player, int diceValue, List<GameEvent> events) {
        Cell cornerCell = board.getCorner(player);
        Pawn existingPawn = cornerCell.getPawn();

        if (existingPawn != null && existingPawn.getPlayer().equals(player)) return;

        List<Pawn> benchPawns = player.getPawnsByState(Pawn.State.BENCH);
        if (benchPawns.isEmpty()) return;

        if (existingPawn != null) {
            existingPawn.remove();
        }

        Pawn pawn = benchPawns.getFirst();
        cornerCell.setPawn(pawn);
        pawn.setCell(cornerCell);
        pawn.setState(Pawn.State.NEWBORN);
        events.add(new GameEvent.PawnPlaced(player.getNumber(), pawn.getNumber(), 0));
    }

    private void executeMovePawn(Player player, int pawnNumber, int steps, List<GameEvent> events) {
        Pawn pawn = player.getPawns().stream()
                .filter(p -> p.getNumber() == pawnNumber)
                .findFirst()
                .orElse(null);
        if (pawn == null || pawn.getState() == Pawn.State.BENCH) return;

        Cell target = pawn.findTargetCell(steps, config);
        if (target == null) return;

        int fromIndex = cellIndex(pawn);

        if (pawn.getState() != Pawn.State.HOMER
                && target.getPawn() != null
                && !target.getPawn().getPlayer().equals(player)) {
            Pawn victim = target.getPawn();
            events.add(new GameEvent.PawnKilled(
                    player.getNumber(), pawn.getNumber(),
                    victim.getPlayer().getNumber(), victim.getNumber()));
            victim.remove();
        }

        pawn.moveTo(target);

        events.add(new GameEvent.PawnMoved(
                player.getNumber(), pawn.getNumber(), fromIndex, cellIndex(pawn), steps));

        if (pawn.getState() == Pawn.State.HOMER) {
            events.add(new GameEvent.EnteredHome(player.getNumber(), pawn.getNumber()));
        }
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
                executePlacePawn(player, 6, events);
            } else {
                Cell target = bestMove.pawn().findTargetCell(bestMove.steps(), config);
                if (target == null) break;

                int fromIndex = cellIndex(bestMove.pawn());

                if (bestMove.pawn().getState() != Pawn.State.HOMER
                        && target.getPawn() != null
                        && !target.getPawn().getPlayer().equals(player)) {
                    Pawn victim = target.getPawn();
                    events.add(new GameEvent.PawnKilled(
                            player.getNumber(), bestMove.pawn().getNumber(),
                            victim.getPlayer().getNumber(), victim.getNumber()));
                    victim.remove();
                    kickedEnemy = true;
                }

                bestMove.pawn().moveTo(target);

                events.add(new GameEvent.PawnMoved(
                        player.getNumber(), bestMove.pawn().getNumber(),
                        fromIndex, cellIndex(bestMove.pawn()), bestMove.steps()));

                if (bestMove.pawn().getState() == Pawn.State.HOMER) {
                    events.add(new GameEvent.EnteredHome(player.getNumber(), bestMove.pawn().getNumber()));
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
                    moves.add(new Move(pawn, dieValue, List.of(dieValue)));
                }
            }
        }

        if (dice.size() == 2) {
            int sum = dice.get(0) + dice.get(1);
            for (Pawn pawn : movablePawns) {
                Cell target = pawn.findTargetCell(sum, config);
                if (target != null) {
                    moves.add(new Move(pawn, sum, List.copyOf(dice)));
                }
            }
        }

        if (dice.contains(6) && !player.getPawnsByState(Pawn.State.BENCH).isEmpty()) {
            Cell cornerCell = board.getCorner(player);
            Pawn existingPawn = cornerCell.getPawn();
            if (existingPawn == null || !existingPawn.getPlayer().equals(player)) {
                moves.add(new Move(null, 0, List.of(6)));

                List<Integer> otherDice = new ArrayList<>(dice);
                otherDice.remove(Integer.valueOf(6));
                for (int dieValue : otherDice) {
                    if (canPlaceAndMove(player, dieValue, board, config)) {
                        moves.add(new Move(null, dieValue, List.of(6, dieValue)));
                    }
                }
            }
        }

        return moves;
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
        if (pawn.getCell() == null) return -1;
        List<Cell> allCells = board.getAllCells();
        for (int i = 0; i < allCells.size(); i++) {
            if (allCells.get(i) == pawn.getCell()) return i;
        }
        return -1;
    }
}
