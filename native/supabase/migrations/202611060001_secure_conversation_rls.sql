-- Secure conversation membership checks for the native clients.
-- Review and apply as a Supabase migration only after staging verification.
begin;

alter table public.conversations
  add column if not exists created_by uuid references auth.users(id);

alter table public.conversations
  alter column created_by set default auth.uid();

-- SECURITY DEFINER avoids recursive RLS when participant policies need to
-- check whether the current user already belongs to the conversation.
create or replace function public.is_conversation_participant(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
drop policy if exists "Authenticated can create conversations" on public.conversations;
drop policy if exists "Users can view conversations they are in" on public.conversations;
drop policy if exists "Messages visible to participants" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;

create policy "Members can view their conversation participants"
on public.conversation_participants
for select to authenticated
using (public.is_conversation_participant(conversation_id));

-- Existing participants can add another participant. The client should
-- implement an explicit invite/accept flow before exposing group messaging.
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

commit;
