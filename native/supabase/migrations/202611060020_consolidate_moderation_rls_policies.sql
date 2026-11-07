-- Split the moderator ALL policy so it no longer overlaps the SELECT policy.
drop policy if exists "Moderators manage enforcement status" on public.account_enforcements;
create policy "Moderators insert enforcement" on public.account_enforcements
  for insert to authenticated with check (private.is_moderator());
create policy "Moderators update enforcement" on public.account_enforcements
  for update to authenticated using (private.is_moderator()) with check (private.is_moderator());
create policy "Moderators delete enforcement" on public.account_enforcements
  for delete to authenticated using (private.is_moderator());

-- Preserve owner and moderator update access in one policy per content table.
drop policy if exists "Moderators can hide or restore posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
create policy "Owners and moderators update posts" on public.posts
  for update to public
  using (((select auth.uid()) = author_id) or private.is_moderator())
  with check (((select auth.uid()) = author_id) or private.is_moderator());

drop policy if exists "Moderators can hide or restore comments" on public.comments;
drop policy if exists "Users can update own comments" on public.comments;
create policy "Owners and moderators update comments" on public.comments
  for update to public
  using (((select auth.uid()) = author_id) or private.is_moderator())
  with check (((select auth.uid()) = author_id) or private.is_moderator());
