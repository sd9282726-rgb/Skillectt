# Skillect Media Moderation Setup

## Current state

The `moderate-media` Supabase Edge Function is deployed with JWT verification enabled. It is designed to fail closed: missing credentials, provider errors, or incomplete scans must never result in publication.

Both native clients currently pause photo publishing and reject a selected photo with a clear message. This is intentional until the moderation provider is configured and the complete upload-to-feed path is tested. Do not enable photo publishing by bypassing the moderation gateway or uploading directly to Storage.

Video upload, playback, and moderation are not implemented.

## Required secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, configure:

- `SIGHTENGINE_API_USER`
- `SIGHTENGINE_API_SECRET`

The Edge Function also uses Supabase's standard runtime secrets. Never put the service-role key or Sightengine secret in Android/iOS source, build config, or client-side environment variables.

## Request contract

POST to:

`/functions/v1/moderate-media`

Headers:
- `Authorization: Bearer <signed-in-user-access-token>`
- `apikey: <Supabase publishable key>`

Body: multipart form-data with one `file` field. Accepted image MIME types are JPEG, PNG, WebP, HEIC, and HEIF. Maximum size is 12 MB.

An approved response includes `status: approved` and `public_url`. Only that returned URL may be attached to a post. Rejected images return HTTP 422. Missing credentials, provider errors, or an incomplete scan return a non-success response; never retry by uploading directly to Storage.

## Storage and approval behavior

- Raw uploads go first to the private `media-quarantine` bucket.
- The function calls Sightengine's image nudity model.
- The public `post-media` bucket receives a copy only after a safe scan.
- An approved `media_assets` row is required before a new image URL can be attached to a post.
- Authenticated client insert and overwrite policies for `post-media` are disabled. Public reads remain enabled temporarily for existing public feed images.

## Required validation before enabling client uploads

1. Configure both Sightengine secrets in Supabase.
2. Test safe, nudity, sexualized, violent, and ambiguous image samples using authorized test fixtures.
3. Confirm provider outages, malformed responses, oversized files, and unsupported MIME types all fail closed.
4. Confirm rejected uploads remain private and appear in the moderator queue.
5. Confirm approved assets are copied to public storage only after approval.
6. Confirm direct Storage upload and direct post URL attachment cannot bypass the approval gate.
7. Verify moderator review, audit records, and retention procedures.
8. Test on real Android and iOS devices before enabling the picker.

## Safety limitations

This is an initial image moderation gate, not a complete teen-safety system. It does not provide video scanning, specialist child-sexual-abuse-material detection, grooming detection, or a fully staffed human-review operation. Automated classification is not a legal determination. Keep photo publishing disabled until all validation and child-safety requirements are met.
