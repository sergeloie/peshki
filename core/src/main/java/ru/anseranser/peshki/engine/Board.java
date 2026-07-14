package ru.anseranser.peshki.engine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.engine.Cell.CellType;

public class Board {

    private final GameConfig config;
    private final DiceRoller diceRoller;
    private final Cell[] corners;
    private final List<Cell> allCells;
    private final List<List<Pawn>> pawnLists;
    private final int[][] pawnCells;

    public Board(GameConfig config) {
        this(config, new RandomDiceRoller(new Random()));
    }

    public Board(GameConfig config, DiceRoller diceRoller) {
        this.config = config;
        this.diceRoller = diceRoller;
        this.corners = new Cell[config.numberOfPlayers()];
        this.allCells = new ArrayList<>();
        this.pawnLists = new ArrayList<>();
        this.pawnCells = new int[config.numberOfPlayers()][config.numberOfPawns()];

        initialize();
    }

    public GameConfig getConfig() { return config; }
    public Cell[] getCorners() { return corners; }
    public List<Cell> getAllCells() { return allCells; }
    public List<List<Pawn>> getPawnLists() { return pawnLists; }

    public Cell getCorner(int playerIndex) { return corners[playerIndex]; }

    public List<Pawn> getPawnList(int playerIndex) { return pawnLists.get(playerIndex); }

    public Pawn getPawn(int playerIndex, int pawnIndex) {
        return pawnLists.get(playerIndex).get(pawnIndex);
    }

    public int getPawnCell(int playerIndex, int pawnIndex) {
        return pawnCells[playerIndex][pawnIndex];
    }

    public void setPawnCell(int playerIndex, int pawnIndex, int cellIndex) {
        pawnCells[playerIndex][pawnIndex] = cellIndex;
    }

    // === State derivation ===

    public boolean isBench(int playerIndex, int pawnIndex) {
        return pawnCells[playerIndex][pawnIndex] == -1;
    }

    public boolean isNewborn(int playerIndex, int pawnIndex) {
        if (isBench(playerIndex, pawnIndex)) return false;
        return getPawn(playerIndex, pawnIndex).getStepsTraveled() == 0;
    }

    public boolean isHome(int playerIndex, int pawnIndex) {
        if (isBench(playerIndex, pawnIndex)) return false;
        int cellIndex = pawnCells[playerIndex][pawnIndex];
        return allCells.get(cellIndex).getCellType() == CellType.HOME;
    }

    public boolean isFielder(int playerIndex, int pawnIndex) {
        return !isBench(playerIndex, pawnIndex) && !isNewborn(playerIndex, pawnIndex) && !isHome(playerIndex, pawnIndex);
    }

    public Pawn.State deriveState(int playerIndex, int pawnIndex) {
        if (isBench(playerIndex, pawnIndex)) return Pawn.State.BENCH;
        if (isNewborn(playerIndex, pawnIndex)) return Pawn.State.NEWBORN;
        if (isHome(playerIndex, pawnIndex)) return Pawn.State.HOMER;
        return Pawn.State.FIELDER;
    }

    public int countHomerPawns(int playerIndex) {
        int count = 0;
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (isHome(playerIndex, i)) count++;
        }
        return count;
    }

    // === Queries ===

    public List<int[]> getMovablePawns(int playerIndex) {
        List<int[]> result = new ArrayList<>();
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (!isBench(playerIndex, i)) {
                result.add(new int[]{i});
            }
        }
        return result;
    }

    public List<int[]> getBenchPawns(int playerIndex) {
        List<int[]> result = new ArrayList<>();
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (isBench(playerIndex, i)) {
                result.add(new int[]{i});
            }
        }
        return result;
    }

    public boolean isCornerFree(int playerIndex) {
        Cell corner = corners[playerIndex];
        return !corner.isOccupied();
    }

    public boolean isCornerOccupiedByEnemy(int playerIndex) {
        Cell corner = corners[playerIndex];
        return corner.isOccupied() && corner.getOccupantPlayerIndex() != playerIndex;
    }

    // === Movement ===

    public Cell findTargetCell(int playerIndex, int pawnIndex, int steps) {
        int cellIndex = pawnCells[playerIndex][pawnIndex];
        if (cellIndex == -1) return null;

        Cell current = allCells.get(cellIndex);
        Cell corner = corners[playerIndex];
        boolean inHome = isHome(playerIndex, pawnIndex);
        boolean isLastLapPawn = !inHome
                && countHomerPawns(playerIndex) == config.numberOfPawns() - 1;

        for (int i = 0; i < steps; i++) {
            Cell next;

            if (!inHome) {
                if (current == corner && !isNewborn(playerIndex, pawnIndex)) {
                    if (isLastLapPawn) {
                        return i == steps - 1 ? corner : null;
                    }
                    inHome = true;
                    next = current.getNextHomeCell();
                } else {
                    next = current.getNextFieldCell();
                    if (next == corner) {
                        if (isLastLapPawn) {
                            return i == steps - 1 ? corner : null;
                        }
                        inHome = true;
                    }
                }
            } else {
                next = current.getNextHomeCell();
            }

            if (next == null) return null;

            if (i < steps - 1 && next.isOccupied()) return null;

            if (i == steps - 1 && next.isOccupied()
                    && next.getOccupantPlayerIndex() == playerIndex) return null;

            current = next;
        }

        return current;
    }

    public void movePawn(int playerIndex, int pawnIndex, Cell target) {
        int oldCellIndex = pawnCells[playerIndex][pawnIndex];
        if (oldCellIndex != -1) {
            allCells.get(oldCellIndex).clearOccupant();
        }
        target.setOccupant(playerIndex, pawnIndex);
        pawnCells[playerIndex][pawnIndex] = target.getIndex();
        getPawn(playerIndex, pawnIndex).setStepsTraveled(
                getPawn(playerIndex, pawnIndex).getStepsTraveled() + 1);
    }

    public void placePawn(int playerIndex, int pawnIndex, Cell corner) {
        corner.setOccupant(playerIndex, pawnIndex);
        pawnCells[playerIndex][pawnIndex] = corner.getIndex();
        getPawn(playerIndex, pawnIndex).reset();
    }

    public void capturePawn(int victimPlayerIndex, int victimPawnIndex) {
        int cellIndex = pawnCells[victimPlayerIndex][victimPawnIndex];
        if (cellIndex != -1) {
            allCells.get(cellIndex).clearOccupant();
        }
        pawnCells[victimPlayerIndex][victimPawnIndex] = -1;
        getPawn(victimPlayerIndex, victimPawnIndex).reset();

        List<Pawn> list = pawnLists.get(victimPlayerIndex);
        Pawn victim = list.remove(victimPawnIndex);
        list.add(victim);
    }

    // === Board generation ===

    private void initialize() {
        for (int i = 0; i < config.numberOfPlayers(); i++) {
            List<Pawn> list = new ArrayList<>();
            for (int j = 0; j < config.numberOfPawns(); j++) {
                list.add(new Pawn());
                pawnCells[i][j] = -1;
            }
            pawnLists.add(list);
        }

        generateCorners();
        generateHomeCells();
        generateFieldCells();
        buildAllCellsIndex();
    }

    private void generateCorners() {
        for (int i = 0; i < config.numberOfPlayers(); i++) {
            corners[i] = new Cell(CellType.CORNER, i);
        }
    }

    private void generateHomeCells() {
        for (int i = 0; i < config.numberOfPlayers(); i++) {
            Cell prev = corners[i];
            for (int j = 1; j < config.numberOfPawns(); j++) {
                Cell cell = new Cell(CellType.HOME, i);
                prev.setNextHomeCell(cell);
                prev = cell;
            }
        }
    }

    private void generateFieldCells() {
        List<Cell> cornerCells = IntStream.range(0, config.numberOfPlayers())
                .mapToObj(i -> corners[i])
                .toList();

        for (int i = 0; i < cornerCells.size(); i++) {
            Cell prev = cornerCells.get(i);
            for (int j = 1; j <= config.sideLength() - 2; j++) {
                Cell cell = new Cell(CellType.FIELD, -1);
                prev.setNextFieldCell(cell);
                prev = cell;
            }
            prev.setNextFieldCell(cornerCells.get((i + 1) % config.numberOfPlayers()));
        }
    }

    private void buildAllCellsIndex() {
        Cell firstCorner = corners[0];
        Cell current = firstCorner;
        do {
            allCells.add(current);
            current = current.getNextFieldCell();
        } while (current != firstCorner);

        for (int i = 0; i < config.numberOfPlayers(); i++) {
            Cell home = corners[i].getNextHomeCell();
            while (home != null) {
                allCells.add(home);
                home = home.getNextHomeCell();
            }
        }

        for (int i = 0; i < allCells.size(); i++) {
            allCells.get(i).setIndex(i);
        }
    }

    // === Restore from GameState ===

    public void restore(GameState state) {
        for (Cell c : allCells) {
            c.clearOccupant();
        }
        for (int[] arr : pawnCells) {
            java.util.Arrays.fill(arr, -1);
        }

        for (GameState.PlayerState ps : state.players()) {
            int pi = ps.playerIndex();
            for (GameState.PawnState pws : ps.pawns()) {
                int ppi = pws.pawnIndex();
                Pawn pawn = getPawn(pi, ppi);
                pawn.setStepsTraveled(pws.stepsTraveled());
                int ci = pws.cellIndex();
                pawnCells[pi][ppi] = ci;
                if (ci >= 0) {
                    allCells.get(ci).setOccupant(pi, ppi);
                }
            }
        }
    }
}
