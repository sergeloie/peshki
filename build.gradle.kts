// Root project: aggregator for the multi-module build.
// Each module declares its own plugins/dependencies; this file only sets
// cross-module defaults (group/version and shared repositories).
group = "ru.anseranser"
version = "0.0.1-SNAPSHOT"

allprojects {
    repositories {
        mavenCentral()
        google()
    }
}
