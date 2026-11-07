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

## Server-side delivery

A Supabase `send-push` Edge Function is deployed. A database trigger queues an invocation whenever a row is inserted into `notifications`. The function verifies a private database-generated internal secret, validates the notification recipient, loads that user's Android tokens, obtains an OAuth access token using a Firebase service account, and sends a generic notification through FCM HTTP v1. It removes tokens that Firebase reports as unregistered.

Set the following Supabase Edge Function secret to activate delivery:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — the complete Firebase service-account JSON for the same Firebase project used by the Android client.

Never embed the service-account JSON/private key in the Android app, iOS app, repository, or client build environment. The service-account JSON belongs only in Supabase Edge Function Secrets.

Until the Android Firebase app identifiers and `FIREBASE_SERVICE_ACCOUNT_JSON` are configured, client registration and server delivery remain inactive. iOS push remains intentionally absent. End-to-end delivery must still be tested on a real Android device before launch.
