rootProject.name = "peshki"

// Pure engine + abstractions (no UI implementations).
include(":core")

// Console UI + game loop entry point.
include(":console")

// Desktop GUI (Swing + FlatLaf).
include(":desktop")
