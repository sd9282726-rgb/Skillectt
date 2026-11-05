# Build Skillect APK without a PC

Use **GitHub Actions** (cloud). Phone browser is enough.

## 1. Add secrets (once)

On phone, open:
https://github.com/sd9282726-rgb/Skillectt/settings/secrets/actions

Add these secrets:

| Name | Value |
|------|--------|
| `KEYSTORE_BASE64` | full contents of `skillect-release.jks.base64.txt` |
| `KEYSTORE_PASSWORD` | `SkillectRelease2026!` |
| `KEY_ALIAS` | `skillect` |
| `KEY_PASSWORD` | `SkillectRelease2026!` |

## 2. Run the build

1. Open https://github.com/sd9282726-rgb/Skillectt/actions
2. Tap **Build Skillect Android APK**
3. Tap **Run workflow** → **Run workflow**
4. Wait 10–20 minutes until green check
5. Open the finished run → **Artifacts** → download **Skillect-release-apk**

That zip contains your release APK for Amazon / Indus.

## Notes
- Package: `com.skillect.app`
- versionCode 3 / versionName 1.0.2
- minSdk 24
- Put a real confirmed Supabase test user in Amazon Testing Instructions
