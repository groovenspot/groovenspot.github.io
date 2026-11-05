plugins {
    alias(libs.plugins.kotlin.jvm)
}

// Platform-free logic shared by the phone app, the watch app and the server:
// condition score, missions, alert signals. Plain Kotlin so it runs anywhere and tests fast.
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
    testImplementation(libs.junit)
}
