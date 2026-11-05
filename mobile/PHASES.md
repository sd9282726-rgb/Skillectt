# Skillect Native APK — Phase plan

## Phase A — Native app source ✅
React Native / Expo (not WebView). Auth, Feed, Create+image, Explore, Profile, Likes. Supabase connected.

## Phase B — Android project ✅
`expo prebuild` → `android/`. Package `com.skillect.app`, minSdk 24, versionCode 3, release signing.

## Phase C — JS bundle ✅ (run on build machine)
```bash
npx expo export:embed --platform android --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res --dev false
```

## Phase D — Gradle plugins ⚠️
Plugin JARs can compile on low RAM; full app configuration needs more memory.

## Phase E — Release APK ❌ not on 1.2GB hosts
```bash
export ANDROID_HOME=/path/to/Android/Sdk
cd mobile   # or skillect-phases package
npm install
./BUILD_APK.sh   # if using phases zip
# or: cd android && ./gradlew :app:assembleRelease
```
Needs ~4GB+ RAM or EAS Build.

## Phase F — Store submission ✅
- Testing instructions: create confirmed Supabase user; paste into Amazon Binary → Testing Instructions
- Privacy: `/docs/privacy-policy.html`
- Account deletion: `/docs/account-deletion.html`
