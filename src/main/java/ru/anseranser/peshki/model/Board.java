package ru.anseranser.peshki.model;

import lombok.Getter;
import ru.anseranser.peshki.enums.CellType;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;
import static ru.anseranser.peshki.MainConfig.numberOfPlayers;
import static ru.anseranser.peshki.MainConfig.sideLength;

@Getter
public class Board {

    private final List<Player> players;
    private final Map<Player, Cell> corners;

    public Board() {
        this.players = generatePlayers();
        this.corners = generateCorners();
        generateHomeCells();
        generateFieldCells();
    }

    private List<Player> generatePlayers() {
        return IntStream
                .rangeClosed(1, numberOfPlayers)
                .mapToObj(p -> new Player(p, this))
                .toList();
    }


    private Map<Player, Cell> generateCorners() {
        return players.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        player -> new Cell(CellType.CORNER, player)
                ));
    }

    private void generateHomeCells() {
        for (Map.Entry<Player, Cell> corner : corners.entrySet()) {
            Cell previousCell = corner.getValue();
            for (int i = 1; i < numberOfPawns; i++) {
                Cell currentCell = new Cell(CellType.HOME, corner.getKey());
                previousCell.setNextHomeCell(currentCell);
                previousCell = currentCell;
            }
        }
    }

    private void generateFieldCells() {
        List<Cell> cornerCells = corners.values().stream().toList();
        for (int i = 0; i < cornerCells.size(); i++) {
            Cell previousCell = cornerCells.get(i);
            for (int j = 1; j <= sideLength - 2 ; j++) {
                Cell currentCell = new Cell(CellType.FIELD);
                previousCell.setNextFieldCell(currentCell);
                previousCell = currentCell;
            }
            previousCell.setNextFieldCell(cornerCells.get((i + 1) % numberOfPlayers));
        }
    }
}
