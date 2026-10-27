pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "PulseCare"
include(":core", ":mobile", ":wear", ":server")
// 서버는 앱과 로직(core)을 함께 쓰려고 같은 빌드에 넣고, 폴더는 pulsecare/server에 둡니다.
project(":server").projectDir = file("../server")
