-- Secure conversation membership checks.
-- Apply only after confirming conversations / conversation_participants / messages tables exist.

begin;

alter table if exists public.conversations
  add column if not exists created_by uuid references auth.users(id);

alter table if exists public.conversations
  alter column created_by set default auth.uid();

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
drop policy if exists "Members can view their conversation participants" on public.conversation_participants;
drop policy if exists "Conversation members can add participants" on public.conversation_participants;
drop policy if exists "Users can view conversations they belong to" on public.conversations;
drop policy if exists "Authenticated users create conversations as themselves" on public.conversations;
drop policy if exists "Only conversation participants can read messages" on public.messages;
drop policy if exists "Only participants can send messages as themselves" on public.messages;

create policy "Members can view their conversation participants"
on public.conversation_participants
for select to authenticated
using (public.is_conversation_participant(conversation_id));

create policy "Conversation members can add participants"
on public.conversation_participants
for insert to authenticated
with check (
  public.is_profile_onboarded()
  and exists (
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
with check (created_by = auth.uid() and public.is_profile_onboarded());

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
  and private.can_send_message(conversation_id)
  and public.is_profile_onboarded()
);

commit;
