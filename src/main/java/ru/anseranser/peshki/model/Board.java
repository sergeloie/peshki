package ru.anseranser.peshki.model;

import lombok.Getter;
import ru.anseranser.peshki.enums.CellType;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;
import static ru.anseranser.peshki.MainConfig.numberOfPlayers;
import static ru.anseranser.peshki.MainConfig.sideLength;

@Getter
public class Board {

    private final List<Player> players;
    private final Map<Player, List<Pawn>> allPawns;
    private final Map<Player, Cell> corners;

    public Board() {
        this.players = generatePlayers();
        this.allPawns = generatePawns();
        this.corners = generateCorners();
        generateHomeCells();
        generateFieldCells();
    }

    private List<Player> generatePlayers() {
        return IntStream
                .rangeClosed(1, numberOfPlayers)
                .mapToObj(Player::new)
                .toList();
    }

    private Map<Player, List<Pawn>> generatePawns() {
        return players.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        player -> IntStream.rangeClosed(1, numberOfPawns)
                                .mapToObj(i -> new Pawn(player))
                                .toList()
                ));
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

    /*TODO Установка новой пешки игрока на угол. Должен выполняться ряд условий. Вернёт true, если пешка встала успешно и false, если пешку поставить нельзя
    1) Угол не занят своей же пешкой
    2) Если угол занят чужой пешкой, то срубаем её (сделать сейчас метод для удаления пешки с доски и возврата в пул пешек)
    3) Ставим свою пешку, ставим newBorn true
    */
    public boolean putNewPawn(Player player) {
        Cell playerCorner = corners.get(player);

    }
}
