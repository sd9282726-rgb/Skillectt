-- Require a completed, server-verified 16+ profile for social write actions.
-- SECURITY DEFINER is used only to read the private DOB for the caller's own account;
-- the function accepts no user ID and returns only a boolean.
create or replace function public.is_profile_onboarded()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.onboarded is true
      and p.date_of_birth is not null
      and public.is_16_plus(p.date_of_birth)
  );
$function$;

revoke all on function public.is_profile_onboarded() from public, anon;
grant execute on function public.is_profile_onboarded() to authenticated;

alter policy "Authenticated users can create posts"
  on public.posts
  with check (((select auth.uid()) = author_id) and public.is_profile_onboarded());

alter policy "Authenticated users can comment"
  on public.comments
  with check (((select auth.uid()) = author_id) and public.is_profile_onboarded());

alter policy "Users can follow"
  on public.follows
  with check (((select auth.uid()) = follower_id) and public.is_profile_onboarded());

alter policy "Users can like posts"
  on public.post_likes
  with check (((select auth.uid()) = user_id) and public.is_profile_onboarded());

alter policy "Users can save posts"
  on public.saved_posts
  with check (((select auth.uid()) = user_id) and public.is_profile_onboarded());

alter policy "Users can create projects"
  on public.projects
  with check (((select auth.uid()) = author_id) and public.is_profile_onboarded());

alter policy "Users can create reports"
  on public.reports
  with check (((select auth.uid()) = reporter_id) and public.is_profile_onboarded());

alter policy "Users can block others"
  on public.blocks
  with check (((select auth.uid()) = blocker_id) and public.is_profile_onboarded());

alter policy "Users create own conversation read markers"
  on public.conversation_reads
  with check (
    (user_id = (select auth.uid()))
    and private.is_conversation_participant(conversation_id)
    and public.is_profile_onboarded()
  );

drop policy if exists "Authenticated can create communities" on public.communities;
alter policy "Authenticated create communities"
  on public.communities
  with check ((auth.uid() = created_by) and public.is_profile_onboarded());

drop policy if exists "Users can join communities" on public.community_members;
alter policy "Users join communities"
  on public.community_members
  with check (
    (auth.uid() = user_id)
    and public.is_profile_onboarded()
    and (
      exists (
        select 1 from public.communities c
        where c.id = community_members.community_id and c.is_private = false
      )
      or role = 'owner'
    )
  );

alter policy "Authenticated users create conversations as themselves"
  on public.conversations
  with check ((created_by = auth.uid()) and public.is_profile_onboarded());

alter policy "Conversation members can add participants"
  on public.conversation_participants
  with check (
    public.is_profile_onboarded()
    and exists (
      select 1 from public.conversations conv
      where conv.id = conversation_participants.conversation_id
        and (conv.created_by = auth.uid() or is_conversation_participant(conv.id))
    )
  );

drop policy if exists "Only participants can send messages as themselves" on public.messages;
alter policy "Only unblocked participants can send messages as themselves"
  on public.messages
  with check (
    sender_id = (select auth.uid())
    and private.can_send_message(conversation_id)
    and public.is_profile_onboarded()
  );
