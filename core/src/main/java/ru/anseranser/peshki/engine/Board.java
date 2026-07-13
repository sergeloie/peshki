package ru.anseranser.peshki.engine;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.engine.Cell.CellType;

public class Board {

    private final List<Player> players;
    private final Map<Player, Cell> corners;
    private final DiceRoller diceRoller;
    private final List<Cell> allCells;

    public Board(GameConfig config) {
        this(config, new RandomDiceRoller(new Random()));
    }

    public Board(GameConfig config, DiceRoller diceRoller) {
        this.diceRoller = diceRoller;
        this.players = IntStream.rangeClosed(1, config.numberOfPlayers())
                .mapToObj(i -> new Player(i, config, diceRoller))
                .toList();
        this.corners = generateCorners();
        generateHomeCells(config);
        generateFieldCells(config);
        this.allCells = buildAllCells();
    }

    public List<Player> getPlayers() {
        return players;
    }

    public Cell getCorner(Player player) {
        return corners.get(player);
    }

    public List<Cell> getAllCells() {
        return allCells;
    }

    /**
     * Rebuilds the mutable board state (pawn positions, states, human flags)
     * from a previously captured {@link GameState}. Cell indices in the state
     * correspond 1:1 to {@link #getAllCells()} because both are produced from
     * the same {@link GameConfig} in a deterministic order.
     */
    public void restore(GameState state) {
        for (Cell c : allCells) c.setPawn(null);

        Map<Integer, Player> playerByNumber = players.stream()
                .collect(Collectors.toMap(Player::getNumber, Function.identity()));

        for (GameState.PlayerState ps : state.players()) {
            Player player = playerByNumber.get(ps.number());
            if (player == null) continue;
            player.setHuman(ps.human());

            Map<Integer, Pawn> pawnByNumber = player.getPawns().stream()
                    .collect(Collectors.toMap(Pawn::getNumber, Function.identity()));

            for (GameState.PawnState pws : ps.pawns()) {
                Pawn pawn = pawnByNumber.get(pws.number());
                if (pawn == null) continue;
                pawn.setState(pws.state());
                Cell cell = pws.cellIndex() < 0 ? null : allCells.get(pws.cellIndex());
                pawn.setCell(cell);
                if (cell != null) cell.setPawn(pawn);
            }
        }
    }

    private List<Cell> buildAllCells() {
        var cells = new java.util.ArrayList<Cell>();

        // Traverse field ring once
        Player firstPlayer = corners.keySet().stream()
                .min(Comparator.comparing(Player::getNumber))
                .orElseThrow();
        Cell corner = corners.get(firstPlayer);
        Cell current = corner;
        do {
            cells.add(current);
            current = current.getNextFieldCell();
        } while (current != corner);

        // Add home cells for each player
        for (Player player : players) {
            Cell home = corners.get(player).getNextHomeCell();
            while (home != null) {
                cells.add(home);
                home = home.getNextHomeCell();
            }
        }

        for (int i = 0; i < cells.size(); i++) {
            cells.get(i).setIndex(i);
        }

        return cells;
    }

    private Map<Player, Cell> generateCorners() {
        return players.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        player -> {
                            Cell corner = new Cell(CellType.CORNER, player);
                            player.setCorner(corner);
                            return corner;
                        }));
    }

    private void generateHomeCells(GameConfig config) {
        for (var entry : corners.entrySet()) {
            Cell prev = entry.getValue();
            for (int i = 1; i < config.numberOfPawns(); i++) {
                Cell cell = new Cell(CellType.HOME, entry.getKey());
                prev.setNextHomeCell(cell);
                prev = cell;
            }
        }
    }

    private void generateFieldCells(GameConfig config) {
        List<Cell> cornerCells = corners.values().stream()
                .sorted(Comparator.comparing(c -> c.getOwner().getNumber()))
                .toList();
        for (int i = 0; i < cornerCells.size(); i++) {
            Cell prev = cornerCells.get(i);
            for (int j = 1; j <= config.sideLength() - 2; j++) {
                Cell cell = new Cell(CellType.FIELD);
                prev.setNextFieldCell(cell);
                prev = cell;
            }
            prev.setNextFieldCell(cornerCells.get((i + 1) % config.numberOfPlayers()));
        }
    }
}
