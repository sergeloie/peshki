package ru.anseranser.peshki.engine;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Pawn {

    public enum State { BENCH, NEWBORN, FIELDER, HOMER }

    private int stepsTraveled;

    public Pawn() {
        this.stepsTraveled = 0;
    }

    public void reset() {
        this.stepsTraveled = 0;
    }
}
