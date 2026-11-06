# Skillect Media Moderation Setup

## Current state

The `moderate-media` Supabase Edge Function is deployed with JWT verification enabled. It is fail-closed: if required provider secrets are missing, the request returns HTTP 503 and no image is published.

Both native apps currently keep photo publishing disabled. They do not call the gateway yet. Do not re-enable photo selection until the provider credentials are configured, the gateway is tested, and both clients are wired to this endpoint.

## Required secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, configure:

- `SIGHTENGINE_API_USER`
- `SIGHTENGINE_API_SECRET`

Supabase's Edge Function runtime must also expose its standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` variables. Never put the service-role key or Sightengine secret in Android/iOS source, build config, or client-side environment variables.

## Request contract

POST to:

`/functions/v1/moderate-media`

Headers:
- `Authorization: Bearer <signed-in-user-access-token>`
- `apikey: <Supabase publishable key>`

Body: multipart form-data with one `file` field. Accepted image MIME types are JPEG, PNG, WebP, HEIC, and HEIF. Maximum size is 12 MB.

A successful response includes `status: approved` and `public_url`. Only that returned URL may be attached to a new post. Rejected images return HTTP 422. Missing credentials, provider errors, or an incomplete scan return a non-success response; do not retry by uploading directly to Storage.

## Storage and approval behavior

- Raw uploads go first to the private `media-quarantine` bucket.
- The function calls Sightengine's `nudity-2.1` model.
- The public `post-media` bucket receives a copy only after a safe scan.
- An approved `media_assets` row is required by the database trigger before a new image URL can be attached to a post.
- Authenticated client insert and overwrite policies for `post-media` are disabled. Public reads remain enabled temporarily for existing public feed images.

## Safety limitations

This is an initial image-only nudity gate, not a complete teen-safety system. It does not yet provide video scanning, text/caption/comment/message screening, specialist child-sexual-abuse-material detection, automated account-ban decisions, or human moderator evidence handling. Automated classification must not be treated as a legal determination. Keep image publishing disabled until the gateway is configured and tested with an agreed moderation policy.
