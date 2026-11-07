plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val releaseStoreFile = System.getenv("KEYSTORE_PATH")
val releaseStorePassword = System.getenv("KEYSTORE_PASSWORD")
val releaseKeyAlias = System.getenv("KEY_ALIAS")
val releaseKeyPassword = System.getenv("KEY_PASSWORD")

android {
    namespace = "com.skillect.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.skillect.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 7
        versionName = "1.4.0"
        buildConfigField("String", "SUPABASE_URL", "\"https://chohswyxsckpwyzlbzav.supabase.co\"")
        buildConfigField("String", "SUPABASE_KEY", "\"sb_publishable__1Bd6TEnLWDtTdT4U4e-oQ_0MeY2E17\"")
    }
    signingConfigs {
        create("release") {
            if (!releaseStoreFile.isNullOrBlank()) storeFile = file(releaseStoreFile)
            if (!releaseStorePassword.isNullOrBlank()) storePassword = releaseStorePassword
            if (!releaseKeyAlias.isNullOrBlank()) keyAlias = releaseKeyAlias
            if (!releaseKeyPassword.isNullOrBlank()) keyPassword = releaseKeyPassword
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildTypes {
        debug { applicationIdSuffix = ".dev"; versionNameSuffix = "-dev" }
        release {
            isMinifyEnabled = false
            if (!releaseStoreFile.isNullOrBlank()) signingConfig = signingConfigs.getByName("release")
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt:coil-compose:2.7.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
