# Skillect Native App Completion Plan

This plan tracks implementation in the native Kotlin/Jetpack Compose Android app and SwiftUI iOS app. Both clients use the existing Supabase project and real user data. No seeded or fake users.

## Release principles
- A successful compile or signed APK is not proof that a feature works.
- Each feature needs Android and iOS implementation, real Supabase integration, loading/empty/error states, authorization/RLS checks, and tests before it is marked complete.
- Never pad APK size. Size should follow real functionality and assets.
- Never put service-role keys or private credentials in mobile clients.

## Phase 1 — Authentication and account lifecycle
- [x] Native signup calls Supabase Auth with display-name and username metadata.
- [x] Native sign-in remains available.
- [x] Forgot-password request calls Supabase Auth recovery.
- [ ] Verify email-confirmation behavior against actual Supabase project settings.
- [ ] Validate username uniqueness and profile creation; handle errors clearly.
- [ ] Test signup, sign-in, recovery email, invalid credentials, session restore, and sign-out on Android and iOS.

## Phase 2 — Profiles, follows, and discovery
- [ ] Profile editing: avatar, cover, bio, location, interests, skills, privacy.
- [x] Follow/unfollow actions use the real `follows` table on Android and iOS; persisted-state loading is implemented. Counts and RLS verification remain.
- [ ] Explore people, skills, tags, and posts with real search and pagination.
- [ ] Profile deep links and private-account behavior.

## Phase 3 — Feed and publishing
- [x] Text-only post creation is implemented on Android and iOS.
- [x] Photo publishing is intentionally paused in both clients until server-side screening credentials and integration tests are complete. No direct upload fallback is available.
- [ ] Video attachments and playback remain unimplemented.
- [ ] Feed pagination, refresh, post detail, comments/replies, likes, saves.
- [x] Direct client writes to the public image bucket are disabled; the private quarantine bucket and 12 MB MIME/size limits are deployed.
- [ ] Image screening provider credentials and full upload test remain.
- [ ] Video playback, image/video caching, retry, and offline/error states.
- [ ] Feed ranking uses real content and explicit empty states.

## Phase 4 — Communities
- [ ] Community discovery/search and detail pages.
- [x] Join action and persisted membership state are implemented on Android and iOS. Leave, member lists, and roles remain.
- [ ] Community posts and moderation/report flows.
- [ ] Verify membership and content RLS policies.

## Phase 5 — Messaging
- [x] Replace the Messages placeholder with native conversation lists and message screens on Android and iOS (basic implementation; awaiting CI and backend migration validation).
- [x] Start a one-to-one conversation from Explore and add both participants (requires the pending conversation RLS migration).
- [x] Send and load messages through Supabase REST on both platforms (basic implementation; no realtime delivery, pagination, or unread counts yet).
- [ ] Block/report behavior inside conversations and participant-only authorization verification.
- [x] Production conversation RLS is repaired: participants only, sender identity enforced, and blocks prevent message sending.
- [ ] Verify with two separate real accounts and a third non-participant before public release.

## Phase 6 — Notifications
- [x] Notifications inbox is reachable from Android navigation and iOS tab bar; both clients load the user's real notification rows and support marking read.
- [ ] Notification event triggers, delivery fan-out, and realtime refresh still need end-to-end verification.
- [ ] Deep links, pagination, realtime refresh, and notification preferences.
- [ ] Push registration and delivery (FCM/APNs), permission prompts, and delivery testing. Requires Firebase/APNs project configuration and server-side credentials.

## Phase 7 — Quality and release
- [ ] Automated unit/API tests and Android/iOS build checks.
- [ ] Install and smoke-test release builds on real Android and iOS devices.
- [ ] Verify auth, feed, media, follows, communities, messaging, and notifications end-to-end.
- [ ] Accessibility, privacy, moderation, crash reporting, performance, and store-readiness review.
- [x] Teen community safety policy drafted, including prohibited sexual content, reporting, review, and permanent-ban standards for confirmed severe violations.
- [x] Database enforcement blocks restricted accounts from posting, commenting, messaging, following, and joining communities.
- [x] Moderator-only report review policies, permanent/suspension records, moderation audit records, and user appeals schema are deployed.
- [x] New image posts require an approved media record; direct authenticated uploads are disabled until a server-side screening gateway is configured.
- [x] Native moderator dashboard added to Android and iOS for report review, post/comment hiding, permanent bans, and appeal decisions (CI and live moderator-account verification pending).
- [x] Restricted-account appeal-only screen added to Android and iOS.
- [ ] Full evidence retention, case history, and human moderation operations remain.
- [x] A fail-closed image moderation Edge Function is deployed; it quarantines uploads privately and only publishes images after a successful nudity scan and an approved database record.
- [ ] Sightengine credentials are not configured; image publishing remains paused in both apps until the provider is configured and the gateway is tested.
- [ ] Video and text screening, specialist child-safety detection, and human review procedures remain unimplemented.

## Current status
Native auth, follow/community membership, notification inbox, basic direct messaging, moderator queue, account restrictions, and appeals are present on the feature branch. Production conversation RLS, device-token registry, account enforcement, moderator policies, hidden-content policies, private media quarantine, and storage restrictions have been applied and verified at the schema/policy level. The image moderation Edge Function is deployed but cannot accept uploads until its provider credentials are configured; photo publishing remains disabled in both clients. Android/iOS build runs are pending or have been cancelled during rapid commits; no successful build of the latest moderator/appeal UI is claimed yet. Remote push delivery, realtime chat, unread counts, video playback/upload, text/grooming screening, specialist child-safety detection, full moderator evidence workflow, signed releases, and real-device E2E remain incomplete. The PR must remain draft until these are tested.
