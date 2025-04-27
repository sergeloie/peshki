package ru.anseranser.peshki.model;

import lombok.Builder;
import lombok.Getter;
import ru.anseranser.peshki.enums.PlayerEnum;


@Builder
@Getter
public class Pawn {
    private PlayerEnum player;
    private int relativePosition;
    private int absolutePosition;
}

