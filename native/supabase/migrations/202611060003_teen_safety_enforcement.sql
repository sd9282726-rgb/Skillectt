-- Teen safety enforcement: account bans, moderator review, appeals, and approved media gate.
-- Direct client uploads are disabled until a server-side moderation gateway is configured.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_moderator()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('moderator', 'admin');
$$;
revoke all on function private.is_moderator() from public, anon;
grant execute on function private.is_moderator() to authenticated;

create table if not exists public.account_enforcements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null check (status in ('suspended','permanent')),
  reason text not null,
  issued_by uuid not null references auth.users(id),
  issued_at timestamptz not null default now(),
  appeal_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.account_enforcements enable row level security;
grant select on public.account_enforcements to authenticated;
drop policy if exists "Users and moderators view enforcement status" on public.account_enforcements;
create policy "Users and moderators view enforcement status"
on public.account_enforcements for select to authenticated
using (user_id = (select auth.uid()) or private.is_moderator());
drop policy if exists "Moderators manage enforcement status" on public.account_enforcements;
create policy "Moderators manage enforcement status"
on public.account_enforcements for all to authenticated
using (private.is_moderator())
with check (private.is_moderator());

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enforcement_user_id uuid not null references public.account_enforcements(user_id) on delete cascade,
  explanation text not null check (length(trim(explanation)) between 20 and 5000),
  status text not null default 'pending' check (status in ('pending','under_review','accepted','rejected')),
  moderator_note text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists moderation_appeals_queue_idx on public.moderation_appeals(status, created_at);
alter table public.moderation_appeals enable row level security;
grant select, insert on public.moderation_appeals to authenticated;
drop policy if exists "Users create appeals for their own account" on public.moderation_appeals;
create policy "Users create appeals for their own account"
on public.moderation_appeals for insert to authenticated
with check (user_id = (select auth.uid()) and enforcement_user_id = (select auth.uid()));
drop policy if exists "Users and moderators view appeals" on public.moderation_appeals;
create policy "Users and moderators view appeals"
on public.moderation_appeals for select to authenticated
using (user_id = (select auth.uid()) or private.is_moderator());
drop policy if exists "Moderators review appeals" on public.moderation_appeals;
create policy "Moderators review appeals"
on public.moderation_appeals for update to authenticated
using (private.is_moderator())
with check (private.is_moderator());

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  target_type text not null,
  target_id uuid,
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.moderation_actions enable row level security;
grant select, insert on public.moderation_actions to authenticated;
drop policy if exists "Moderators view moderation audit" on public.moderation_actions;
create policy "Moderators view moderation audit"
on public.moderation_actions for select to authenticated
using (private.is_moderator());
drop policy if exists "Moderators write moderation audit" on public.moderation_actions;
create policy "Moderators write moderation audit"
on public.moderation_actions for insert to authenticated
with check (moderator_id = (select auth.uid()) and private.is_moderator());

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  public_url text unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected','quarantined')),
  provider text,
  provider_reference text,
  decision_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.media_assets enable row level security;
grant select on public.media_assets to authenticated;
drop policy if exists "Owners and moderators view media review status" on public.media_assets;
create policy "Owners and moderators view media review status"
on public.media_assets for select to authenticated
using (owner_id = (select auth.uid()) or private.is_moderator());

-- Never trust client-supplied user IDs or user-editable metadata for account status.
create or replace function private.reject_enforced_account_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  actor := coalesce(
    nullif(to_jsonb(new) ->> 'author_id','')::uuid,
    nullif(to_jsonb(new) ->> 'sender_id','')::uuid,
    nullif(to_jsonb(new) ->> 'follower_id','')::uuid,
    nullif(to_jsonb(new) ->> 'user_id','')::uuid,
    nullif(to_jsonb(new) ->> 'id','')::uuid
  );
  if actor is not null and exists (
    select 1 from public.account_enforcements e
    where e.user_id = actor and e.status in ('suspended','permanent')
  ) then
    raise exception 'This account is restricted from participating on Skillect.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_enforced_account_activity() from public, anon, authenticated;

drop trigger if exists enforce_posts_account_status on public.posts;
create trigger enforce_posts_account_status before insert or update on public.posts
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_comments_account_status on public.comments;
create trigger enforce_comments_account_status before insert or update on public.comments
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_messages_account_status on public.messages;
create trigger enforce_messages_account_status before insert or update on public.messages
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_follows_account_status on public.follows;
create trigger enforce_follows_account_status before insert or update on public.follows
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_community_members_account_status on public.community_members;
create trigger enforce_community_members_account_status before insert or update on public.community_members
for each row execute function private.reject_enforced_account_activity();

-- New image URLs must be backed by an approved server-reviewed asset.
create or replace function private.require_approved_post_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.image_url is not null and (
    tg_op = 'INSERT'
    or new.image_url is distinct from old.image_url
  ) and not exists (
    select 1 from public.media_assets a
    where a.owner_id = new.author_id
      and a.public_url = new.image_url
      and a.status = 'approved'
  ) then
    raise exception 'Image publishing is paused until the media safety check approves this upload.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.require_approved_post_media() from public, anon, authenticated;
drop trigger if exists require_approved_media_for_posts on public.posts;
create trigger require_approved_media_for_posts before insert or update of image_url on public.posts
for each row execute function private.require_approved_post_media();

-- Disable every known direct client upload policy for the public bucket.
-- Public reads remain temporarily enabled so existing feed images do not break.
drop policy if exists "Authenticated users can upload post-media" on storage.objects;
drop policy if exists "Users upload post-media into their own folder" on storage.objects;
drop policy if exists "Moderation gateway only may upload post-media" on storage.objects;
create policy "Moderation gateway only may upload post-media"
on storage.objects for insert to authenticated
with check (false);

-- Moderator access to reports is based only on trusted app_metadata.
drop policy if exists "Moderators can review reports" on public.reports;
create policy "Moderators can review reports"
on public.reports for select to authenticated
using (private.is_moderator());
drop policy if exists "Moderators can update reports" on public.reports;
create policy "Moderators can update reports"
on public.reports for update to authenticated
using (private.is_moderator())
with check (private.is_moderator());

-- Extend account restrictions to profile edits, likes, saves, and projects.
drop trigger if exists enforce_profile_account_status on public.profiles;
create trigger enforce_profile_account_status before update on public.profiles
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_post_likes_account_status on public.post_likes;
create trigger enforce_post_likes_account_status before insert or update on public.post_likes
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_saved_posts_account_status on public.saved_posts;
create trigger enforce_saved_posts_account_status before insert or update on public.saved_posts
for each row execute function private.reject_enforced_account_activity();
drop trigger if exists enforce_projects_account_status on public.projects;
create trigger enforce_projects_account_status before insert or update on public.projects
for each row execute function private.reject_enforced_account_activity();

-- Every ban, suspension, and removal is recorded in the moderation audit log.
create or replace function private.audit_account_enforcement_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
declare
  actor uuid;
  target uuid;
  action_name text;
  action_reason text;
begin
  if tg_op = 'DELETE' then
    target := old.user_id;
    actor := auth.uid();
    action_name := 'enforcement_removed';
    action_reason := old.reason;
  else
    target := new.user_id;
    actor := new.issued_by;
    action_name := case when new.status = 'permanent' then 'permanent_ban' else 'account_suspension' end;
    action_reason := new.reason;
  end if;
  insert into public.moderation_actions(moderator_id,target_user_id,target_type,target_id,action,reason)
  values(actor,target,'account',target,action_name,action_reason);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$;
revoke all on function private.audit_account_enforcement_change() from public, anon, authenticated;
drop trigger if exists audit_account_enforcement_changes on public.account_enforcements;
create trigger audit_account_enforcement_changes
after insert or update or delete on public.account_enforcements
for each row execute function private.audit_account_enforcement_change();

commit;
