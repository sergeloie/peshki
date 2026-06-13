plugins {
	application
	alias(libs.plugins.freefairLombokPLugin)
	id("org.springframework.boot") version "3.3.4"
	id("io.spring.dependency-management") version "1.1.6"
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
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-web")

	implementation("org.atp-fivt:ljv:1.04")

	compileOnly(libs.lombok)
	annotationProcessor(libs.lombok)
	testCompileOnly(libs.lombok)
	testAnnotationProcessor(libs.lombok)

	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")

	implementation("com.lihaoyi:mill-moduledefs_3:0.12.7")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
