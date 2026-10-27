plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    application
}

// Family server: accounts, invites, guardian links, daily summaries, emergency escalation and FCM pushes.
// Shares the alert texts and escalation order with the apps through :core.
application {
    mainClass.set("com.groovenspot.pulsecare.server.MainKt")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.status.pages)
    implementation(libs.ktor.server.call.logging)
    implementation(libs.ktor.serialization.json)
    implementation(libs.postgresql)
    implementation(libs.hikari)
    implementation(libs.google.auth)
    implementation(libs.logback)

    testImplementation(libs.junit)
    testImplementation(libs.ktor.server.test.host)
    testImplementation(libs.ktor.client.content.negotiation)
}

// DB tests need a Postgres: PULSECARE_TEST_DB=jdbc:postgresql://localhost:5432/pulsecare_test?user=postgres
tasks.test {
    environment("PULSECARE_TEST_DB", System.getenv("PULSECARE_TEST_DB") ?: "")
}
