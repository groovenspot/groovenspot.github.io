plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    // Renders watch screens from sample data: ./gradlew :wear:recordPaparazziDebug
    alias(libs.plugins.paparazzi)
}

// Wear OS app: score tile, complication, today's mission and SOS. Scores come from the phone over the Data Layer.
android {
    namespace = "com.groovenspot.pulsecare.wear"
    compileSdk = 36

    defaultConfig {
        // 데이터 레이어는 같은 패키지 이름·서명의 앱끼리만 통합니다.
        applicationId = "com.groovenspot.pulsecare"
        minSdk = 30
        targetSdk = 36
        // 스토어에 올릴 때마다 올립니다: -Ppulsecare.versionCode=2 (CI는 실행 번호)
        versionCode = providers.gradleProperty("pulsecare.versionCode").orNull?.toInt() ?: 1
        versionName = "0.1.0"
    }

    // 업로드 키: 키 파일과 비밀번호는 저장소에 넣지 않고 ~/.gradle/gradle.properties 또는 CI 비밀값으로.
    // pulsecare.signing.storeFile, storePassword, keyAlias, keyPassword. 없으면 서명하지 않은 릴리스가 나옵니다.
    val signing = providers.gradleProperty("pulsecare.signing.storeFile").orNull?.let { file(it) }?.takeIf { it.exists() }
    signingConfigs {
        if (signing != null) {
            create("upload") {
                storeFile = signing
                storePassword = providers.gradleProperty("pulsecare.signing.storePassword").get()
                keyAlias = providers.gradleProperty("pulsecare.signing.keyAlias").get()
                keyPassword = providers.gradleProperty("pulsecare.signing.keyPassword").get()
            }
        }
    }

    buildTypes {
        release {
            if (signing != null) signingConfig = signingConfigs.getByName("upload")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":core"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.wear.compose.material)
    implementation(libs.wear.compose.foundation)

    implementation(libs.wear.tiles)
    implementation(libs.wear.protolayout)
    implementation(libs.wear.protolayout.material)
    implementation(libs.wear.complications.data.source)
    implementation(libs.androidx.concurrent.futures)

    implementation(libs.play.services.wearable)
    implementation(libs.kotlinx.coroutines.play.services)

    testImplementation(libs.junit)
}
