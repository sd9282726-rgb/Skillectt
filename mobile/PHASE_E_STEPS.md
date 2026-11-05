# Phase E micro-steps (native release APK)

| Step | Command / task | Notes |
|------|----------------|--------|
| **E.0** | `npx expo export:embed ...` | Pre-bundle JS offline |
| **E.1** | `./gradlew :gradle-plugin:shared:jar :gradle-plugin:settings-plugin:jar :gradle-plugin:react-native-gradle-plugin:jar` | RN Gradle plugins |
| **E.2** | `./gradlew :app:preBuild` | Needs ≥4GB RAM (configures full Android app) |
| **E.3** | `./gradlew :app:mergeReleaseResources` | |
| **E.4** | `./gradlew :app:compileReleaseJavaWithJavac` | |
| **E.5** | `./gradlew :app:mergeDexRelease` | |
| **E.6** | `./gradlew :app:packageRelease` | |
| **E.7** | `./gradlew :app:assembleRelease -x lint -x test` | Final APK |

## On a PC (recommended: single script)

```bash
unzip skillect-native-phases.zip
cd skillect-phases
export ANDROID_HOME=/path/to/Android/Sdk
./BUILD_APK.sh
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

## Keystore
- `skillect-release.jks`
- Password: `SkillectRelease2026!`
- Alias: `skillect`

## Amazon
- minSdk 24, versionCode 3, versionName 1.0.2
- Package `com.skillect.app`
- Paste test account into Binary → Testing Instructions (see `AMAZON_TESTING_INSTRUCTIONS.txt`)
