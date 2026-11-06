-- Notification events and per-device push token registry.
-- This migration is staged in the feature branch; do not apply to production
-- until reviewed and tested in a staging Supabase project.

begin;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android','ios')),
  token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, token)
);

alter table public.device_tokens enable row level security;
drop policy if exists "Users manage their own device tokens" on public.device_tokens;
create policy "Users manage their own device tokens"
on public.device_tokens
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
    values (new.following_id, new.follower_id, 'new_follower', 'profile', new.follower_id, 'started following you');
  end if;
  return new;
end;
$$;

create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
    values (post_author, new.user_id, 'post_like', 'post', new.post_id, 'liked your post');
  end if;
  return new;
end;
$$;

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
    values (post_author, new.author_id, 'post_comment', 'post', new.post_id, 'commented on your post');
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_on_follow on public.follows;
create trigger notifications_on_follow
after insert on public.follows
for each row execute function public.notify_new_follow();

drop trigger if exists notifications_on_post_like on public.post_likes;
create trigger notifications_on_post_like
after insert on public.post_likes
for each row execute function public.notify_post_like();

drop trigger if exists notifications_on_post_comment on public.comments;
create trigger notifications_on_post_comment
after insert on public.comments
for each row execute function public.notify_post_comment();

commit;
