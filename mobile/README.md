# Skillect Mobile — Native (Expo / React Native)

**Not a WebView.** Native screens + Supabase.

Package: `com.skillect.app` · Version `1.0.2` · versionCode `3` · minSdk 24

## No PC — build APK in the cloud

See **[BUILD_NO_PC.md](./BUILD_NO_PC.md)**

1. Add Actions secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
2. Open Actions → **Build Skillect Android APK** → Run workflow (or push to `mobile/`)
3. Download artifact **Skillect-release-apk**

## Features

- Email auth, Feed, Like, Create + image, Explore, Profile

## Amazon testing instructions

```
Test account:
Email: [confirmed Supabase user]
Password: [password]

Steps: Install → Sign in → Feed → Create → Explore → Profile
```
