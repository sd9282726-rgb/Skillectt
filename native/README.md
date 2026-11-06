# Skillect native apps

Skillect is an India-first social platform for teenagers to share learning, skills, projects, and progress. The Android and iOS clients in this directory are native applications; they use the Supabase project configured in source.

## Architecture

- Android: Kotlin, Jetpack Compose, OkHttp, Firebase Messaging client (configuration required).
- iOS: SwiftUI, URLSession, Keychain session storage.
- Backend: Supabase Auth, PostgreSQL, Storage, Row Level Security, and Edge Functions.
- Never place a Supabase service-role key, provider secret, or signing private key in a mobile app or source control.

## Implemented in the current native clients

- Email/password sign-up, sign-in, password reset, and local session persistence.
- Feed reading, text-only post creation, likes, saves, and comments.
- Profile discovery/editing and follow/unfollow.
- Projects and community discovery/joining.
- One-to-one conversation screens, participant-scoped message access, message sending through the text moderation gateway, and per-conversation unread counts.
- In-app notifications and mark-as-read.
- Report and block controls.
- Restricted-account appeal-only screen.
- Moderator screens for pending reports, hidden posts/comments, appeals, blocked text cases, and rejected media cases.

## Backend safety controls already deployed

- Conversation and message RLS restricts access to participants and enforces sender identity.
- Restricted accounts are blocked from core social writes by database enforcement.
- Direct post/comment/message/profile writes are routed through the text moderation gateway; database triggers prevent the old direct REST write path from bypassing it.
- Media upload is routed through a fail-closed moderation gateway and quarantined before approval. Direct client upload to the public media bucket is disabled.
- Report evidence and moderator action audit records are stored in moderator-only tables.
- Android push delivery infrastructure exists, but requires Firebase configuration and a service-account secret.
- iOS remote push is intentionally not included.

## Known limitations — not production-ready

1. **No signed production package yet.** Android CI currently verifies a debug APK only. A signed APK/AAB requires a release keystore and passwords. iOS CI produces an unsigned simulator app, not an installable device IPA; App Store distribution requires Apple signing and provisioning.
2. **Moderation credentials missing.** Text and image publishing fail closed until `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` are configured in Supabase Edge Function Secrets and tested.
3. **Media publishing is disabled in both clients.** The image moderation service exists, but photo publishing is intentionally paused in the clients until provider configuration and full end-to-end tests pass. Video upload/playback/moderation is not implemented.
4. **Hindi/Hinglish safety is unvalidated.** Current text screening is not validated for the language mix expected from Indian teenagers. Do not launch until it is tested and supported.
5. **Specialist child-safety coverage is incomplete.** No dedicated grooming/CSAM detection and escalation integration is verified. Automated classifiers are not a substitute for trained human moderation.
6. **Messaging is not realtime.** Messages are fetched over REST; websocket subscriptions and robust reconnect/offline delivery are not implemented.
7. **Test coverage is incomplete.** Real-device E2E, two-account RLS tests, non-participant access tests, media adversarial tests, and full signup/session-expiry tests remain outstanding.
8. **Moderation operations are incomplete.** Quarantined-media preview, evidence retention/purge scheduling, moderator role provisioning, and a staffed escalation process must be completed.
9. **Push delivery is unverified.** Android FCM requires GitHub Actions client identifiers and the `FIREBASE_SERVICE_ACCOUNT_JSON` Supabase secret. iOS remote push remains out of scope by explicit product decision.
10. **Auth security warning remains.** Supabase security advisor reports leaked-password protection disabled; enable it in Supabase Auth settings and verify.
11. **Teen onboarding requirements remain.** Age/consent flow, India eligibility checks, privacy notices, and a legally reviewed child-safety process must be completed before public launch.

## Build workflows

- `.github/workflows/native-android.yml` builds a debug APK for CI. Its manual `signed-release` mode builds APK and AAB only after the signing secrets are configured.
- `.github/workflows/native-ios.yml` builds an unsigned iOS Simulator app ZIP. This is not an App Store IPA.
- CI artifacts expire after 14 days and are not store releases.

## Required configuration

### Android release signing (GitHub Actions secrets)

- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

Keep the keystore backed up securely. Losing the upload key can block future updates.

### Text/image moderation (Supabase Edge Function secrets)

- `SIGHTENGINE_API_USER`
- `SIGHTENGINE_API_SECRET`

Do not put these secrets in client source or build config.

### Android push

GitHub Actions secrets: `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_PROJECT_ID`, `FIREBASE_SENDER_ID`.

Supabase Edge Function secret: `FIREBASE_SERVICE_ACCOUNT_JSON`.

### iOS distribution

Requires an Apple Developer team, distribution certificate, provisioning profile, and App Store Connect setup.

## Package identifiers

- Android: `com.skillect.app`
- iOS: `com.skillect.app`
