# Skillect Mobile — Native (Expo / React Native)

**Not a WebView.** This is a real React Native app with native screens, navigation, image picker, and Supabase.

## Features in the app

- Email sign up / sign in (verified accounts)
- Premium white + blue UI
- **Feed** — posts, media, categories, pull-to-refresh
- **Like** posts
- **Create** — text + category + image upload to Supabase Storage
- **Explore** — search people, follow
- **Profile** — edit display name, username, bio, sign out

Package: `com.skillect.app` · Version `1.0.2` · versionCode `3`

## Run locally

```bash
cd mobile
npm install
npx expo start
```

## Build store APK (required for Amazon / Indus)

This environment cannot produce a full 80MB+ native release binary. Use **EAS Build** on your machine or CI:

```bash
npm install -g eas-cli
cd mobile
eas login
eas init
eas build --platform android --profile amazon
```

`eas.json` already has an `amazon` profile (APK).

Typical release size is often **30–70MB** depending on assets; 80–90MB is possible with more images/fonts/native modules, not by wrapping a website.

## Amazon testing instructions (paste in Binary tab)

```
Test account:
Email: [create a real confirmed test user in Supabase Auth]
Password: [that user's password]

Steps:
1. Install and open Skillect
2. Sign in with the test email/password above
3. Browse Feed, open Create, Explore, Profile
```

You must create a **confirmed** Supabase user first (email confirmation required).
