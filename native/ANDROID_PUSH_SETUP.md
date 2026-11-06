# Android push notification setup

Android now contains an optional Firebase Cloud Messaging client integration. iOS remote push is intentionally not included.

## Client build configuration

The Android app reads these Gradle environment variables and does nothing if any are missing:

- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SENDER_ID`

They are passed to GitHub Actions from repository Actions secrets by `.github/workflows/native-android.yml`. They can also be exported in a local Android build environment. These values identify the Firebase Android app; do not put a Firebase service-account private key in the mobile app.

The registered Android package name is `com.skillect.app`. Debug builds use the `.dev` application ID suffix, so a Firebase Android app registration may also be needed for `com.skillect.app.dev` if push is required in debug builds.

## What the Android client does

- Initializes Firebase only when all required Firebase app identifiers are present.
- Requests Android 13+ notification permission.
- Creates a notification channel.
- Obtains the FCM registration token after sign-in and upserts it into Supabase `device_tokens`.
- Refreshes the registry when Firebase rotates the token.
- Displays a generic notification instead of putting private message text or moderation details on the lock screen.

If Firebase configuration is absent, the app continues to work without remote push and does not crash.

## Server-side delivery still required

Token registration alone does not send push notifications. A trusted server sender must use a Firebase service account and the FCM HTTP v1 API to deliver events to registered Android tokens. Never embed the service-account JSON/private key in the Android app, iOS app, repository, or client environment.

The current Supabase database stores device tokens, but automatic notification-event fan-out and Firebase server delivery have not yet been enabled or verified. Keep push marked unavailable until the sender and delivery tests are complete.
