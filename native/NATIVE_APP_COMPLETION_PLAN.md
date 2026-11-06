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
- [ ] Follow/unfollow with follower/following counts and RLS-safe queries.
- [ ] Explore people, skills, tags, and posts with real search and pagination.
- [ ] Profile deep links and private-account behavior.

## Phase 3 — Feed and publishing
- [ ] Create posts with text, image, and video attachments.
- [ ] Feed pagination, refresh, post detail, comments/replies, likes, saves.
- [ ] Supabase Storage upload with content-type/size validation and progress.
- [ ] Video playback, image/video caching, retry, and offline/error states.
- [ ] Feed ranking uses real content and explicit empty states.

## Phase 4 — Communities
- [ ] Community discovery/search and detail pages.
- [ ] Join/leave, member lists, roles, and membership state.
- [ ] Community posts and moderation/report flows.
- [ ] Verify membership and content RLS policies.

## Phase 5 — Messaging
- [ ] Replace Messages placeholder with inbox and conversation screens.
- [ ] One-to-one conversation creation and participant invitation/acceptance.
- [ ] Real message send/receive, pagination, unread counts, and realtime updates.
- [ ] Block/report behavior and participant-only authorization.
- [ ] Test RLS for users outside a conversation.

## Phase 6 — Notifications
- [ ] Real follow/like/comment/reply/community/message notifications.
- [ ] Read/unread state, deep links, pagination, and realtime refresh.
- [ ] Push registration and delivery; permission prompts and preferences.

## Phase 7 — Quality and release
- [ ] Automated unit/API tests and Android/iOS build checks.
- [ ] Install and smoke-test release builds on real Android and iOS devices.
- [ ] Verify auth, feed, media, follows, communities, messaging, and notifications end-to-end.
- [ ] Accessibility, privacy, moderation, crash reporting, performance, and store-readiness review.

## Current status
Phase 1 UI/API calls have been added on the native branch. They are not verified until builds pass and real Supabase account-lifecycle tests succeed. All later phases remain incomplete until implemented and tested.
