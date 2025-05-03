package ru.anseranser.peshki.model;

import lombok.Builder;
import lombok.Getter;
import ru.anseranser.peshki.enums.Player;


@Builder
@Getter
public class Pawn {
    private Player player;
    private Cell cell;
    private boolean newBorn;


}

