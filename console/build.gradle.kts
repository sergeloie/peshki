plugins {
    application
}

dependencies {
    implementation(project(":core"))

    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

application {
    mainClass.set("ru.anseranser.peshki.Main")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
