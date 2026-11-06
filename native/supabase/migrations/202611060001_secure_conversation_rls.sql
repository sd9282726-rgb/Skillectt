-- Profile bootstrap, private conversation membership, and owned media paths.
-- Apply only after this migration has been reviewed and tested against a staging project.

begin;

-- The live database already has an auth.users trigger calling public.handle_new_user().
-- Replace that function in place; do not add a second trigger, which would attempt
-- a duplicate profiles insert for each signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  safe_username text;
  requested_display_name text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  safe_username := regexp_replace(requested_username, '[^a-z0-9_]', '', 'g');

  if length(safe_username) < 3 then
    safe_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  end if;

  requested_display_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  if requested_display_name is null then
    requested_display_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New member');
  end if;

  insert into public.profiles (id, email, display_name, username, avatar_url)
  values (
    new.id,
    new.email,
    requested_display_name,
    safe_username,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- Conversations are visible only to their participants. The prior live
-- predicates compared columns to themselves or compared conversation_id to
-- participant row id, which did not enforce membership correctly.
alter table public.conversations
  add column if not exists created_by uuid references auth.users(id);

alter table public.conversations
  alter column created_by set default auth.uid();

create or replace function public.is_conversation_participant(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = _conversation_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists "Participants visible to members" on public.conversation_participants;
drop policy if exists "Users can join conversations" on public.conversation_participants;
drop policy if exists "Members can view their conversation participants" on public.conversation_participants;
drop policy if exists "Conversation members can add participants" on public.conversation_participants;
drop policy if exists "Authenticated can create conversations" on public.conversations;
drop policy if exists "Users can view conversations they are in" on public.conversations;
drop policy if exists "Users can view conversations they belong to" on public.conversations;
drop policy if exists "Authenticated users create conversations as themselves" on public.conversations;
drop policy if exists "Messages visible to participants" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Only conversation participants can read messages" on public.messages;
drop policy if exists "Only participants can send messages as themselves" on public.messages;

create policy "Members can view their conversation participants"
on public.conversation_participants
for select to authenticated
using (public.is_conversation_participant(conversation_id));

-- A conversation creator can add the initial participants; existing
-- participants can add invitees. The app must still implement invite/accept UI.
create policy "Conversation members can add participants"
on public.conversation_participants
for insert to authenticated
with check (
  exists (
    select 1
    from public.conversations conv
    where conv.id = conversation_participants.conversation_id
      and (
        conv.created_by = auth.uid()
        or public.is_conversation_participant(conv.id)
      )
  )
);

create policy "Users can view conversations they belong to"
on public.conversations
for select to authenticated
using (public.is_conversation_participant(id));

create policy "Authenticated users create conversations as themselves"
on public.conversations
for insert to authenticated
with check (created_by = auth.uid());

create policy "Only conversation participants can read messages"
on public.messages
for select to authenticated
using (public.is_conversation_participant(conversation_id));

create policy "Only participants can send messages as themselves"
on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_participant(conversation_id)
);

-- Restrict post-media uploads and replacements to a path rooted at the
-- authenticated user's UUID. Public read is intentional for public posts.
drop policy if exists "Authenticated users can upload post-media" on storage.objects;
drop policy if exists "Users can delete own post-media" on storage.objects;
drop policy if exists "Users can update own post-media" on storage.objects;

create policy "Users upload post-media into their own folder"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete their own post-media"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update their own post-media"
on storage.objects
for update to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
