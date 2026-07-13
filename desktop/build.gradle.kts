plugins {
    application
}

dependencies {
    implementation(project(":core"))
    implementation("com.formdev:flatlaf:3.4")
}

application {
    mainClass.set("ru.anseranser.peshki.desktop.DesktopLauncher")
}
