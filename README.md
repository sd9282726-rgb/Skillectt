# Skillect

Skillect is an India-first social platform concept for teenagers to share what they are learning, build skills, publish projects, and connect with peers. Accounts and activity must be real; the app must not seed fake users or fake engagement.

## Repository layout

- `native/android/` — native Android application (Kotlin + Jetpack Compose).
- `native/ios/` — native iOS application (SwiftUI).
- The root web application is a legacy surface and is not the native-app release target.
- Supabase provides authentication, PostgreSQL, Storage, and Edge Functions.

## Current native feature implementation

The Android and iOS clients include authentication, feed, profiles, follows, comments, projects, communities, one-to-one conversations, in-app notifications, account restriction/appeal screens, reporting/blocking, and moderator review screens.

The backend includes participant-scoped conversation access, account enforcement, text/media moderation gateways, report evidence, moderator audit records, and notification delivery infrastructure.

## Release status — 6 November 2026

**Not production-ready. Do not publish or describe this build as a finished release.**

- Android CI currently verifies a debug APK. A signed production APK/AAB has not been produced because the release keystore and passwords are not configured.
- iOS CI currently targets an unsigned simulator app. A signed device archive / App Store package has not been produced because Apple signing assets and provisioning are not configured.
- Text and image moderation fail closed until the Sightengine secrets are configured and tested.
- Android push delivery requires Firebase client configuration and the service-account secret. iOS remote push is intentionally not included.
- Hindi/Hinglish moderation coverage, specialist child-safety/grooming detection, video moderation, realtime messaging, device-level end-to-end tests, two-account RLS tests, and scheduled evidence-retention cleanup remain incomplete.
- Supabase Auth leaked-password protection is currently flagged as disabled by the security advisor.
- Moderator access requires a trusted `app_metadata.role` value; do not use user-editable metadata for authorization.

## Required production configuration

Configure secrets in the appropriate provider dashboards; never commit them to the repository.

### Android release signing (GitHub Actions)

- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

Run the **Native Android build** workflow with `build_type=signed-release` after these are configured. Keep the keystore and passwords private and backed up. Losing the signing key can prevent future app updates.

### Text and image moderation (Supabase Edge Function secrets)

- `SIGHTENGINE_API_USER`
- `SIGHTENGINE_API_SECRET`

Publishing remains fail-closed until the service is configured and tested, including Hindi/Hinglish samples and teen-safety cases.

### Android push (GitHub Actions and Supabase)

- GitHub Actions: `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_PROJECT_ID`, `FIREBASE_SENDER_ID`
- Supabase Edge Function secret: `FIREBASE_SERVICE_ACCOUNT_JSON`

Do not add service-account JSON or signing material to source control.

### iOS distribution

A valid Apple Developer team, distribution certificate, provisioning profile, and App Store Connect configuration are required for a signed device/App Store build. Simulator builds are not installable production packages.

## Safety and release policy

- No fake or seeded user accounts.
- Prohibited sexual content, exploitation, grooming, self-harm encouragement, violence, and other unsafe content must be blocked and escalated appropriately.
- Moderation must fail closed when its provider is unavailable.
- Do not launch to minors until child-safety coverage, age/consent requirements, moderation escalation, reporting, retention, and human review have been validated.
- Keep the pull request in draft until release builds, security checks, RLS tests, and real-device tests pass.

## License

Private / All rights reserved.
