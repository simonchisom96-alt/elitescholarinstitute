plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.elitescholarinstitute.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.elitescholarinstitute.app"
        minSdk = 23
        targetSdk = 35
        versionCode = 362318
        versionName = "1.2"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
