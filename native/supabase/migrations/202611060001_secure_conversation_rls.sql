-- Secure conversation membership checks for the native clients.
-- Review and apply as a Supabase migration only after staging verification.
begin;

alter table public.conversations
  add column if not exists created_by uuid references auth.users(id);

alter table public.conversations
  alter column created_by set default auth.uid();

drop policy if exists "Participants visible to members" on public.conversation_participants;
drop policy if exists "Users can join conversations" on public.conversation_participants;
drop policy if exists "Authenticated can create conversations" on public.conversations;
drop policy if exists "Users can view conversations they are in" on public.conversations;
drop policy if exists "Messages visible to participants" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;

create policy "Members can view their conversation participants"
on public.conversation_participants
for select to authenticated
using (
  exists (
    select 1
    from public.conversation_participants as viewer
    where viewer.conversation_id = conversation_participants.conversation_id
      and viewer.user_id = (select auth.uid())
  )
);

-- A conversation creator may add participants. Existing participants may add
-- another member as an explicit invitation flow is implemented in the app.
create policy "Conversation members can add participants"
on public.conversation_participants
for insert to authenticated
with check (
  exists (
    select 1
    from public.conversations as conv
    where conv.id = conversation_participants.conversation_id
      and (
        conv.created_by = (select auth.uid())
        or exists (
          select 1
          from public.conversation_participants as viewer
          where viewer.conversation_id = conv.id
            and viewer.user_id = (select auth.uid())
        )
      )
  )
);

create policy "Users can view conversations they belong to"
on public.conversations
for select to authenticated
using (
  exists (
    select 1
    from public.conversation_participants as cp
    where cp.conversation_id = conversations.id
      and cp.user_id = (select auth.uid())
  )
);

create policy "Authenticated users create conversations as themselves"
on public.conversations
for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "Only conversation participants can read messages"
on public.messages
for select to authenticated
using (
  exists (
    select 1
    from public.conversation_participants as cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = (select auth.uid())
  )
);

create policy "Only participants can send messages as themselves"
on public.messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversation_participants as cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = (select auth.uid())
  )
);

commit;
