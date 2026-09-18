package ru.anseranser.peshki.engine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.engine.Cell.CellType;

public class Board {

    private final GameConfig config;
    private final Cell[] corners;
    private final List<Cell> allCells;
    private final List<List<Pawn>> pawnLists;
    private final BoardTopology topology;
    private final Position position;

    public Board(GameConfig config) {
        this.config = config;
        this.corners = new Cell[config.numberOfPlayers()];
        this.allCells = new ArrayList<>();
        this.pawnLists = new ArrayList<>();
        this.topology = new BoardTopology(config);
        this.position = new Position(topology);

        initialize();
    }

    public GameConfig getConfig() { return config; }
    public Cell[] getCorners() { return corners; }
    public List<Cell> getAllCells() { return allCells; }

    public Cell getCorner(int playerIndex) { return corners[playerIndex]; }

    public List<Pawn> getPawnList(int playerIndex) { return pawnLists.get(playerIndex); }

    public Pawn getPawn(int playerIndex, int pawnIndex) {
        return pawnLists.get(playerIndex).get(pawnIndex);
    }

    public BoardTopology getTopology() { return topology; }
    public Position getPosition() { return position; }

    public int getPawnCell(int playerIndex, int pawnIndex) {
        return position.cellOf(playerIndex, pawnIndex);
    }

    // === State derivation (delegated to Position) ===

    public boolean isBench(int playerIndex, int pawnIndex) {
        return position.isBench(playerIndex, pawnIndex);
    }

    public boolean isNewborn(int playerIndex, int pawnIndex) {
        return position.isNewborn(playerIndex, pawnIndex);
    }

    public boolean isHome(int playerIndex, int pawnIndex) {
        return position.isHome(playerIndex, pawnIndex);
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
        return position.countHome(playerIndex);
    }

    /**
     * Closeness to home (ticket 05, RULES.MD §3). Higher = closer to winning:
     * bench -2, newborn -1, fielder 0..ringSize-1 (ring steps already
     * travelled from own corner), homer 1000+homeStep. View layers use this
     * to number pawns #1..#4; the domain never displays or mutates by it.
     */
    public int pawnProgress(int playerIndex, int pawnIndex) {
        if (position.isBench(playerIndex, pawnIndex)) return -2;
        if (position.isNewborn(playerIndex, pawnIndex)) return -1;
        int cell = position.cellOf(playerIndex, pawnIndex);
        if (topology.isHomeCellIndex(cell)) {
            return 1000 + topology.homeStep(playerIndex, cell);
        }
        int ring = topology.ringSize();
        int corner = topology.cornerRingIndex(playerIndex);
        return (cell - corner - 1 + ring) % ring;
    }

    // === Queries ===

    public List<PawnId> getMovablePawns(int playerIndex) {
        List<PawnId> result = new ArrayList<>();
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (!isBench(playerIndex, i)) {
                result.add(new PawnId(playerIndex, i));
            }
        }
        return result;
    }

    public List<PawnId> getBenchPawns(int playerIndex) {
        List<PawnId> result = new ArrayList<>();
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (isBench(playerIndex, i)) {
                result.add(new PawnId(playerIndex, i));
            }
        }
        return result;
    }

    // === Movement (thin adapters over PathFinder) ===

    public Cell findTargetCell(int playerIndex, int pawnIndex, int steps) {
        Integer target = PathFinder.find(topology, position, playerIndex,
                position.cellOf(playerIndex, pawnIndex),
                steps, !position.isNewborn(playerIndex, pawnIndex));
        return target == null ? null : allCells.get(target);
    }

    public Cell findTargetCellFromCorner(int playerIndex, int steps) {
        Integer target = PathFinder.find(topology, position, playerIndex,
                topology.cornerRingIndex(playerIndex), steps, false);
        return target == null ? null : allCells.get(target);
    }

    public void movePawn(int playerIndex, int pawnIndex, Cell target) {
        position.move(playerIndex, pawnIndex, target.getIndex());
    }

    public void placePawn(int playerIndex, int pawnIndex, Cell corner) {
        position.place(playerIndex, pawnIndex, corner.getIndex());
    }

    public void capturePawn(int victimPlayerIndex, int victimPawnIndex) {
        position.capture(victimPlayerIndex, victimPawnIndex);
    }

    // === Board generation ===

    private void initialize() {
        for (int i = 0; i < config.numberOfPlayers(); i++) {
            List<Pawn> list = new ArrayList<>();
            for (int j = 0; j < config.numberOfPawns(); j++) {
                list.add(new Pawn());
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
        position.clearAll();

        for (GameState.PlayerState ps : state.players()) {
            int pi = ps.playerIndex();
            for (GameState.PawnState pws : ps.pawns()) {
                int ppi = pws.pawnIndex();
                int ci = pws.cellIndex();
                if (ci < 0) {
                    position.capture(pi, ppi);
                } else if (pws.stepsTraveled() > 0) {
                    position.move(pi, ppi, ci);
                } else {
                    position.place(pi, ppi, ci);
                }
            }
        }
    }
}
