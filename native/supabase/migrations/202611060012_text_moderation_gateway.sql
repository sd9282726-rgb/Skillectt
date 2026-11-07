-- Enforce that new posts, comments and messages pass through the server moderation gateway.
create table if not exists public.moderation_text_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('post','comment','message','profile')),
  content_snapshot text not null,
  reason text not null,
  provider_reference text,
  status text not null default 'blocked' check (status in ('blocked','reviewed','escalated')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  moderator_note text
);
create index if not exists moderation_text_cases_queue_idx on public.moderation_text_cases(status,created_at);
alter table public.moderation_text_cases enable row level security;
grant select,update on public.moderation_text_cases to authenticated;
drop policy if exists "Moderators review blocked text cases" on public.moderation_text_cases;
create policy "Moderators review blocked text cases"
on public.moderation_text_cases for select to authenticated
using (private.is_moderator());
drop policy if exists "Moderators update blocked text cases" on public.moderation_text_cases;
create policy "Moderators update blocked text cases"
on public.moderation_text_cases for update to authenticated
using (private.is_moderator())
with check (private.is_moderator());

create or replace function private.require_text_moderation_gateway()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Text content must pass Skillect safety screening before publishing.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.require_text_moderation_gateway() from public,anon,authenticated;
drop trigger if exists require_moderated_text_for_posts on public.posts;
create trigger require_moderated_text_for_posts before insert on public.posts
for each row execute function private.require_text_moderation_gateway();
drop trigger if exists require_moderated_text_for_comments on public.comments;
create trigger require_moderated_text_for_comments before insert on public.comments
for each row execute function private.require_text_moderation_gateway();
drop trigger if exists require_moderated_text_for_messages on public.messages;
create trigger require_moderated_text_for_messages before insert on public.messages
for each row execute function private.require_text_moderation_gateway();

drop trigger if exists require_moderated_text_for_profiles on public.profiles;
create trigger require_moderated_text_for_profiles before update of display_name,username,bio on public.profiles
for each row execute function private.require_text_moderation_gateway();
