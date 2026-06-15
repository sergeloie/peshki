plugins {
	application
	alias(libs.plugins.freefairLombokPLugin)
	id("com.autonomousapps.dependency-analysis") version "1.30.0"
}

group = "ru.anseranser"
version = "0.0.1-SNAPSHOT"

application {
    mainClass.set("ru.anseranser.peshki.Main")
}

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

dependencies {
	compileOnly(libs.lombok)
	annotationProcessor(libs.lombok)
	testCompileOnly(libs.lombok)
	testAnnotationProcessor(libs.lombok)

	testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
