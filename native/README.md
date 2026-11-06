# Skillect native apps

This directory is a separate native implementation. It does not replace or modify the existing web app or the existing Expo app.

## Android
- Kotlin + Jetpack Compose
- Package: `com.skillect.app`
- Minimum Android: API 24
- Cloud build: GitHub Actions workflow **Native Android build**
- Current foundation: Supabase email/password sign-in and a read-only feed backed by the existing `profiles` and `posts` tables.

## iOS
- Swift + SwiftUI
- Bundle identifier: `com.skillect.app`
- Simulator build is intended to run on a macOS GitHub Actions runner. App Store distribution requires Apple signing assets.

## Backend safety
Both native clients use the Supabase publishable key and the signed-in user's access token. Never put a service-role key in a mobile app. All user data access must remain subject to Supabase RLS.

The existing database has legacy messaging RLS policies whose conversation-participant checks are not correctly correlated to the row being accessed. The native app must not expose direct messaging until those policies are reviewed and corrected with a dedicated migration and regression tests. This native branch does not alter the live database.

## Current implementation status
This is the initial native foundation, not a completed store-ready release. Authentication and feed are the first vertical slice. Profile editing, publishing/media upload, likes, comments, search, follows, projects, communities, notifications, reporting/blocking, and secure messaging still need implementation and device-level testing.
