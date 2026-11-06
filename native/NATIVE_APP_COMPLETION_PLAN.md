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
- [ ] Text + image post creation and image selection/upload are implemented on Android and iOS (awaiting CI and end-to-end verification). Video attachments remain.
- [ ] Feed pagination, refresh, post detail, comments/replies, likes, saves.
- [ ] Supabase Storage image upload uses the authenticated user's folder and a 12 MB image limit; server-side bucket limits are in the pending migration. Upload progress and end-to-end verification remain.
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
- [ ] Test RLS for users outside a conversation; the current production policies were found to contain invalid membership predicates, so messaging must remain disabled for public release until migration 0001 is applied and verified in staging.

## Phase 6 — Notifications
- [x] Notifications inbox is reachable from Android navigation and iOS tab bar; both clients load the user's real notification rows and support marking read.
- [ ] Event triggers for follow/like/comment notifications are prepared in a pending migration; apply and test in staging before production.
- [ ] Deep links, pagination, realtime refresh, and notification preferences.
- [ ] Push registration and delivery (FCM/APNs), permission prompts, and delivery testing. Requires Firebase/APNs project configuration and server-side credentials.

## Phase 7 — Quality and release
- [ ] Automated unit/API tests and Android/iOS build checks.
- [ ] Install and smoke-test release builds on real Android and iOS devices.
- [ ] Verify auth, feed, media, follows, communities, messaging, and notifications end-to-end.
- [ ] Accessibility, privacy, moderation, crash reporting, performance, and store-readiness review.
- [x] Teen community safety policy drafted, including prohibited sexual content, reporting, review, and permanent-ban standards for confirmed severe violations.
- [ ] Operational moderation queue, pre-publication media/text screening, admin-only permanent-ban tooling, evidence handling, and appeals are not yet implemented.

## Current status
Phase 1 auth UI/API calls, Phase 2 follow/community-membership slices, native notification inbox, and basic direct-message screens/send/load flows are present on the feature branch. Android debug build passed for the latest messaging commit; iOS simulator CI is queued. Notifications triggers/device-token registry and secure conversation/storage policies are staged migrations, not applied to production. No remote FCM/APNs push, realtime messaging, NSFW scanning, operational moderator workflow, signed release build, or full end-to-end device test is claimed. Existing production conversation RLS predicates were confirmed unsafe; do not enable messaging publicly until migration 0001 is staged, applied, and verified. All remaining features stay incomplete until tested.
