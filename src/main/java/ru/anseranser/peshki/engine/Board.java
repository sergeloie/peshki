package ru.anseranser.peshki.engine;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.engine.Cell.CellType;

public class Board {

    private final List<Player> players;
    private final Map<Player, Cell> corners;

    public Board(GameConfig config) {
        this.players = IntStream.rangeClosed(1, config.numberOfPlayers())
                .mapToObj(i -> new Player(i, config))
                .toList();
        this.corners = generateCorners();
        generateHomeCells(config);
        generateFieldCells(config);
    }

    public List<Player> getPlayers() {
        return players;
    }

    public Cell getCorner(Player player) {
        return corners.get(player);
    }

    public List<Cell> getAllCells() {
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
