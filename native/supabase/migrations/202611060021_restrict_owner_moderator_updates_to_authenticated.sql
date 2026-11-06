-- These policies are only intended for signed-in users. An anonymous session
-- cannot satisfy the ownership predicate and should not execute moderator checks.
alter policy "Owners and moderators update posts" on public.posts to authenticated;
alter policy "Owners and moderators update comments" on public.comments to authenticated;
