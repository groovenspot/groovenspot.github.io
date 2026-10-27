plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    // Renders screens from sample data: ./gradlew :mobile:recordPaparazziDebug
    alias(libs.plugins.paparazzi)
}

// Phone app: reads the night from Health Connect, shows the morning score and today's mission.
android {
    namespace = "com.groovenspot.pulsecare.mobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.groovenspot.pulsecare"
        minSdk = 26
        targetSdk = 36
        // 스토어에 올릴 때마다 올립니다: -Ppulsecare.versionCode=2 (CI는 실행 번호)
        versionCode = providers.gradleProperty("pulsecare.versionCode").orNull?.toInt() ?: 1
        versionName = "0.1.0"

        // 가족 서버와 FCM. 비워 두면 가족 탭이 "서버 설정 전"으로 보이고 푸시를 쓰지 않습니다.
        // ~/.gradle/gradle.properties 또는 -P로: pulsecare.serverUrl, pulsecare.firebase.{appId,apiKey,projectId,senderId}
        fun prop(name: String) = "\"" + (providers.gradleProperty("pulsecare.$name").orNull ?: "") + "\""
        buildConfigField("String", "SERVER_URL", prop("serverUrl"))
        buildConfigField("String", "FIREBASE_APP_ID", prop("firebase.appId"))
        buildConfigField("String", "FIREBASE_API_KEY", prop("firebase.apiKey"))
        buildConfigField("String", "FIREBASE_PROJECT_ID", prop("firebase.projectId"))
        buildConfigField("String", "FIREBASE_SENDER_ID", prop("firebase.senderId"))
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
        // 테스트 도구(디버그 빌드에서만 보임)
        buildConfig = true
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
    implementation(libs.androidx.lifecycle.runtime.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.health.connect.client)
    implementation(libs.androidx.work.runtime)
    // 워치 앱과 오늘 요약·미션 완료·SOS를 주고받습니다.
    implementation(libs.play.services.wearable)
    implementation(libs.kotlinx.coroutines.play.services)
    // 가족 알림 (긴급·보호자 요약)
    implementation(libs.firebase.messaging)

    testImplementation(libs.junit)
    // android.jar's org.json is a stub in local unit tests.
    testImplementation(libs.org.json)
}
