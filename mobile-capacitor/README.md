# Skillect — Capacitor (Amazon Appstore)

Native **Android** wrapper around Skillect (same Supabase backend).

| Field | Value |
|-------|--------|
| App ID | `com.skillect.app` |
| App name | Skillect |
| Framework | Capacitor 8 |

## Build APK for Amazon (on your PC)

### Requirements
- Node.js 20+
- [Android Studio](https://developer.android.com/studio) (includes SDK)

### Commands

```bash
cd mobile-capacitor
npm install

# Web UI is already in www/
npx cap sync android

# Open Android Studio
npx cap open android
```

In Android Studio:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**  
   or **Build → Generate Signed Bundle / APK** (recommended for store)
2. Wait for build
3. Locate the APK (Studio shows a link)
4. Upload that APK to [Amazon Developer Console](https://developer.amazon.com)

### Signed release (for store)

1. In Android Studio: **Build → Generate Signed App Bundle or APK**
2. Create a new keystore (save it safely — never commit it)
3. Build **release APK**
4. Upload the release APK to Amazon

## What the app includes

- Email sign up / sign in (Supabase)
- Email confirmation required
- Feed of posts from the same database as the website

## Privacy policy

Required by Amazon: see `docs/PRIVACY_POLICY_TEMPLATE.md` — publish on HTTPS and paste the URL in the store listing.

## Google Play (later)

Same project. In Android Studio generate a **signed AAB** (Android App Bundle) instead of APK.
