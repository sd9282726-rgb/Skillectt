-- Add first-class community scoping to posts.
-- Community posts remain subject to the existing text/media moderation gateway.
alter table public.posts
  add column if not exists community_id uuid
  references public.communities(id) on delete set null;

create index if not exists posts_community_created_at_idx
  on public.posts (community_id, created_at desc)
  where community_id is not null;

drop policy if exists "Owners and moderators update posts" on public.posts;

create policy "Owners and moderators update posts"
on public.posts
for update
to authenticated
using (
  (select auth.uid()) = author_id
  or private.is_moderator()
)
with check (
  (
    (select auth.uid()) = author_id
    or private.is_moderator()
  )
  and (
    community_id is null
    or private.is_moderator()
    or exists (
      select 1
      from public.community_members cm
      where cm.community_id = posts.community_id
        and cm.user_id = (select auth.uid())
    )
  )
);
