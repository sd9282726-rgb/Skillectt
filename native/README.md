# Skillect native apps

This directory contains separate native Android (Kotlin/Jetpack Compose) and iOS (SwiftUI) applications. The existing web application and existing Expo app are not replaced or modified by this work.

## Backend
- Supabase project: `chohswyxsckpwyzlbzav`
- Both apps use the project's publishable key and the signed-in user's access token.
- Never place a service-role key in a mobile app.
- All reads and writes are subject to Supabase Row Level Security.

## Implemented native vertical slices
- Email/password sign-in with persisted session (Android preferences / iOS Keychain).
- Feed read and refresh.
- Create text posts.
- Like/unlike and save/unsave posts.
- Read and create comments.
- Search public profiles and follow/unfollow (iOS); profile lookup (Android).
- Profile editing (Android and iOS), profile discovery and follow/unfollow.
- Read projects and create a project (Android and iOS).
- Browse communities and join (Android and iOS).
- Read notifications and mark them read (Android and iOS).\n- Report posts and block accounts (Android and iOS).

## Still required before a complete public release
- Device testing on real Android and iOS devices, including account creation, email confirmation, password reset and session expiry.
- Image/video picker, compression, upload to Supabase Storage, media rendering and moderation.
- Full profile detail screens, pagination, filtering and robust empty/loading/error states.
- Community creation, member lists, feed filtering and role/moderation tools.
- Complete notification generation and deep links.
- Reporting/blocking UI and moderator workflow.
- Direct messaging is intentionally not exposed yet. The existing live database contains conversation RLS expressions that compare columns to themselves instead of correlating to the row being checked. A proposed correction is in `native/supabase/migrations/202611060001_secure_conversation_rls.sql`; it has **not** been applied to the live database. It needs staging tests and an invitation/consent flow before messaging is enabled.
- App icons, splash screens, accessibility, privacy disclosures, age-appropriate safeguards, performance and security review.
- Release signing: Android requires the owner's signing keystore and secure GitHub secrets. iOS App Store distribution requires an Apple Developer account and signing credentials.

## Build workflows
- **Native Android build** creates a debug APK artifact in GitHub Actions.
- **Native iOS build** creates an unsigned iOS Simulator app ZIP. It is not an installable App Store IPA.
- Artifacts are temporary GitHub Actions artifacts and expire after 14 days.

## Package identifiers
- Android: `com.skillect.app`
- iOS: `com.skillect.app`
