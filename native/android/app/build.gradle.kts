plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.skillect.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.skillect.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 4
        versionName = "1.1.0"
        buildConfigField("String", "SUPABASE_URL", "\"https://chohswyxsckpwyzlbzav.supabase.co\"")
        buildConfigField("String", "SUPABASE_KEY", "\"sb_publishable__1Bd6TEnLWDtTdT4U4e-oQ_0MeY2E17\"")
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildTypes {
        debug { applicationIdSuffix = ".dev"; versionNameSuffix = "-dev" }
        release { isMinifyEnabled = false }
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
    debugImplementation("androidx.compose.ui:ui-tooling")
}
