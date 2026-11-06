-- Per-user read markers used to compute unread message counts.
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id,user_id)
);
alter table public.conversation_reads enable row level security;
grant select,insert,update on public.conversation_reads to authenticated;
drop policy if exists "Users view own conversation read markers" on public.conversation_reads;
create policy "Users view own conversation read markers"
on public.conversation_reads for select to authenticated
using (user_id=(select auth.uid()) and private.is_conversation_participant(conversation_id));
drop policy if exists "Users create own conversation read markers" on public.conversation_reads;
create policy "Users create own conversation read markers"
on public.conversation_reads for insert to authenticated
with check (user_id=(select auth.uid()) and private.is_conversation_participant(conversation_id));
drop policy if exists "Users update own conversation read markers" on public.conversation_reads;
create policy "Users update own conversation read markers"
on public.conversation_reads for update to authenticated
using (user_id=(select auth.uid()) and private.is_conversation_participant(conversation_id))
with check (user_id=(select auth.uid()) and private.is_conversation_participant(conversation_id));
