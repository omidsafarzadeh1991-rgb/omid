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
        // Neshan Maps Platform SDK
        maven { url = uri("https://maven.neshan.org/artifactory/public-maven") }
    }
}

rootProject.name = "SamplingApp"
include(":app")
