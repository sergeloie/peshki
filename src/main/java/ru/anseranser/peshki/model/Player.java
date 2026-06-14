package ru.anseranser.peshki.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static ru.anseranser.peshki.MainConfig.numberOfDices;
import static ru.anseranser.peshki.MainConfig.numberOfPawns;
import static ru.anseranser.peshki.MainConfig.numberOfPlayers;
import static ru.anseranser.peshki.MainConfig.numberOfSidesOnDice;
import static ru.anseranser.peshki.MainConfig.sideLength;
import static ru.anseranser.peshki.model.Pawn.PawnState.BENCH;

@Getter
@EqualsAndHashCode(of = "playerNumber")
public class Player {
    private static final Random random = new Random();

    private final Integer playerNumber;
    private final Board board;
    private final List<Pawn> pawns;
    @Setter
    private Cell corner;
    @Setter
    private boolean human;

    public static record Move(Pawn pawn, int steps, List<Integer> consumedDice) {}

    public Player(int playerNumber, Board board) {
        this.playerNumber = playerNumber;
        this.board = board;
        this.pawns = IntStream.rangeClosed(1, numberOfPawns)
                .mapToObj(i -> new Pawn(this, i))
                .toList();
    }

    private Pawn getBenchPawn() {
        return pawns.stream()
                .filter(pawn -> pawn.getState() == BENCH)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No more BENCH pawns for player: " + this.playerNumber));
    }

    public Pawn putNewPawn() {
        Cell cornerCell = board.getCorners().get(this);
        Pawn pawn = getBenchPawn();
        cornerCell.setPawn(pawn);
        pawn.setCell(cornerCell);
        pawn.setState(Pawn.PawnState.NEWBORN);
        return pawn;
    }

    private Integer DropDice() {
        return random.nextInt(1, numberOfSidesOnDice + 1);
    }

    public List<Integer> DropDices() {
        return Stream
                .generate(this::DropDice)
                .limit(numberOfDices)
                .toList();
    }

    public List<Pawn> getPawnsByState(Pawn.PawnState... states) {
        return pawns.stream()
                .filter(pawn -> {
                    for (Pawn.PawnState state : states) {
                        if (pawn.getState() == state) return true;
                    }
                    return false;
                })
                .toList();
    }

    public boolean tryPlaceNewPawn() {
        Pawn existingPawn = corner.getPawn();

        if (existingPawn != null && existingPawn.getPlayer().equals(this)) {
            return false;
        }

        if (getPawnsByState(BENCH).isEmpty()) {
            return false;
        }

        if (existingPawn != null) {
            existingPawn.remove();
        }

        putNewPawn();
        return true;
    }

    public boolean shouldPlacePawn(List<Integer> dice) {
        if (!dice.contains(6)) return false;
        if (getPawnsByState(BENCH).isEmpty()) return false;

        Pawn existingPawn = corner.getPawn();
        if (existingPawn != null && existingPawn.getPlayer().equals(this)) {
            return false;
        }

        int scoreWithoutPlace = generateAllMoves(dice).stream()
                .mapToInt(this::scoreMove)
                .max()
                .orElse(0);

        int scoreWithPlace = evaluatePlaceAndMove(dice);

        return scoreWithPlace > scoreWithoutPlace;
    }

    public boolean tryMovePawns(List<Integer> dice) {
        boolean kickedEnemy = false;
        List<Integer> remainingDice = new ArrayList<>(dice);

        while (!remainingDice.isEmpty()) {
            Optional<Move> bestMove = findBestMove(remainingDice);
            if (bestMove.isEmpty()) break;

            Move move = bestMove.get();
            Cell target = move.pawn().findTargetCell(move.steps());

            if (move.pawn().getState() != Pawn.PawnState.HOMER
                    && target.getPawn() != null
                    && !target.getPawn().getPlayer().equals(this)) {
                target.getPawn().remove();
                kickedEnemy = true;
            }

            move.pawn().moveTo(target);
            remainingDice.removeAll(move.consumedDice());
        }

        return kickedEnemy;
    }

    public Optional<Move> findBestMove(List<Integer> availableDice) {
        return generateAllMoves(availableDice).stream()
                .max(Comparator.comparingInt(this::scoreMove));
    }

    public List<Move> generateAllMoves(List<Integer> dice) {
        List<Move> moves = new ArrayList<>();
        List<Pawn> movablePawns = getMovablePawns();

        for (int dieValue : dice) {
            for (Pawn pawn : movablePawns) {
                Cell target = pawn.findTargetCell(dieValue);
                if (target != null) {
                    moves.add(new Move(pawn, dieValue, List.of(dieValue)));
                }
            }
        }

        if (dice.size() == 2) {
            int sum = dice.get(0) + dice.get(1);
            for (Pawn pawn : movablePawns) {
                Cell target = pawn.findTargetCell(sum);
                if (target != null) {
                    moves.add(new Move(pawn, sum, new ArrayList<>(dice)));
                }
            }
        }

        if (dice.contains(6) && !getPawnsByState(Pawn.PawnState.BENCH).isEmpty()) {
            Cell cornerCell = this.corner;
            Pawn existingPawn = cornerCell.getPawn();
            if (existingPawn == null || !existingPawn.getPlayer().equals(this)) {
                moves.add(new Move(null, 6, List.of(6)));
            }
        }

        return moves;
    }

    private List<Pawn> getMovablePawns() {
        return getPawnsByState(
                Pawn.PawnState.NEWBORN,
                Pawn.PawnState.FIELDER,
                Pawn.PawnState.HOMER);
    }

    private int scoreMove(Move move) {
        if (move.pawn() == null) {
            Pawn existingPawn = corner.getPawn();
            if (existingPawn != null && !existingPawn.getPlayer().equals(this)) {
                return 800_000;
            }
            return 100_000;
        }

        Pawn pawn = move.pawn();
        int steps = move.steps();
        Cell target = pawn.findTargetCell(steps);
        if (target == null) return -1;

        boolean killsEnemy = pawn.getState() != Pawn.PawnState.HOMER
                && target.getPawn() != null
                && !target.getPawn().getPlayer().equals(this);

        Player enemy = killsEnemy ? target.getPawn().getPlayer() : null;

        boolean entersHome = pawn.getState() == Pawn.PawnState.FIELDER
                && target.getCellType() == Cell.CellType.HOME;

        Cell source = pawn.getCell();
        boolean onEnemyCorner = source.getCellType() == Cell.CellType.CORNER
                && !source.getCornerOrHomeOwner().equals(this);
        boolean onOwnCorner = source.getCellType() == Cell.CellType.CORNER
                && source.getCornerOrHomeOwner().equals(this);

        if (isWinningMove(pawn, steps)) return 1_000_000;
        if (killsEnemy && isEnemyLastFieldPawn(enemy)) return 900_000;
        if (killsEnemy) return 800_000;
        if (entersHome) return 700_000;
        if (onEnemyCorner) return 600_000;
        if (onOwnCorner) return 500_000;

        int maxDistance = numberOfPlayers * (sideLength - 2);
        int distance = calculateDistanceToHome(pawn);
        return 400_000 + (maxDistance - distance);
    }

    private boolean isWinningMove(Pawn pawn, int steps) {
        if (pawn.getState() == Pawn.PawnState.HOMER) return false;
        Cell target = pawn.findTargetCell(steps);
        if (target == null || target != pawn.getPlayer().getCorner()) return false;
        return pawns.stream()
                .filter(p -> p != pawn && p.getState() == Pawn.PawnState.HOMER)
                .count() == numberOfPawns - 1;
    }

    private boolean isEnemyLastFieldPawn(Player enemy) {
        if (enemy == null) return false;
        long homeCount = enemy.getPawns().stream()
                .filter(p -> p.getState() == Pawn.PawnState.HOMER)
                .count();
        long fieldCount = enemy.getPawns().stream()
                .filter(p -> p.getState() != Pawn.PawnState.HOMER && p.getState() != BENCH)
                .count();
        return homeCount == numberOfPawns - 1 && fieldCount == 1;
    }

    private int calculateDistanceToHome(Pawn pawn) {
        if (pawn.getState() == Pawn.PawnState.HOMER) return 0;
        Cell pawnCorner = pawn.getPlayer().getCorner();
        Cell current = pawn.getCell();
        if (current == pawnCorner) return numberOfPlayers * (sideLength - 2);
        int distance = 0;
        int maxDistance = numberOfPlayers * (sideLength - 2);
        while (current != pawnCorner && distance < maxDistance) {
            current = current.getNextFieldCell();
            distance++;
        }
        return distance;
    }

    private int evaluatePlaceAndMove(List<Integer> dice) {
        List<Integer> remainingDice = new ArrayList<>(dice);
        remainingDice.remove(Integer.valueOf(6));

        int baseScore = 100_000;
        Pawn existingPawn = corner.getPawn();
        if (existingPawn != null && !existingPawn.getPlayer().equals(this)) {
            baseScore += 200_000;
        }

        int bestScore = baseScore;

        for (int dieValue : remainingDice) {
            Cell current = corner;
            boolean valid = true;
            for (int i = 0; i < dieValue; i++) {
                Cell next = current.getNextFieldCell();
                if (next == null) { valid = false; break; }
                if (i < dieValue - 1 && next.getPawn() != null) { valid = false; break; }
                current = next;
            }
            if (valid) {
                bestScore = Math.max(bestScore, baseScore + evaluateTargetScore(current));
            }
        }

        if (remainingDice.size() == 2) {
            int sum = remainingDice.get(0) + remainingDice.get(1);
            Cell current = corner;
            boolean valid = true;
            for (int i = 0; i < sum; i++) {
                Cell next = current.getNextFieldCell();
                if (next == null) { valid = false; break; }
                if (i < sum - 1 && next.getPawn() != null) { valid = false; break; }
                current = next;
            }
            if (valid) {
                bestScore = Math.max(bestScore, baseScore + evaluateTargetScore(current));
            }
        }

        return bestScore;
    }

    private int evaluateTargetScore(Cell target) {
        if (target.getPawn() != null && !target.getPawn().getPlayer().equals(this)) {
            Player enemy = target.getPawn().getPlayer();
            if (isEnemyLastFieldPawn(enemy)) return 900_000;
            return 800_000;
        }
        if (target == corner) {
            long homeCount = pawns.stream()
                    .filter(p -> p.getState() == Pawn.PawnState.HOMER)
                    .count();
            if (homeCount == numberOfPawns - 1) return 1_000_000;
        }
        return 0;
    }
}
