-- MVP video posts with moderator approval (no third-party media API).
alter table public.media_assets
  add column if not exists media_type text not null default 'image',
  add column if not exists mime_type text,
  add column if not exists post_content text;

alter table public.posts
  add column if not exists media_type text not null default 'text';

alter table public.posts
  drop constraint if exists posts_media_type_check;
alter table public.posts
  add constraint posts_media_type_check check (media_type in ('text','image','video'));

alter table public.media_assets
  drop constraint if exists media_assets_media_type_check;
alter table public.media_assets
  add constraint media_assets_media_type_check check (media_type in ('image','video'));

create index if not exists media_assets_pending_created_idx
  on public.media_assets (created_at)
  where status = 'pending' and reviewed_at is null;

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/heic','image/heif',
      'video/mp4','video/webm','video/quicktime'
    ]
where id in ('media-quarantine','post-media');
