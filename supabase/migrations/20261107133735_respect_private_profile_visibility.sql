alter policy "Public profiles are viewable by everyone"
  on public.profiles
  using (
    is_private = false
    or id = (select auth.uid())
    or private.is_moderator()
  );

alter policy "Visible posts are viewable by everyone"
  on public.posts
  using (
    (moderation_hidden = false and exists (
      select 1 from public.profiles p
      where p.id = posts.author_id
        and (p.is_private = false or p.id = (select auth.uid()))
    ))
    or private.is_moderator()
  );

alter policy "Visible comments are viewable by everyone"
  on public.comments
  using (
    (moderation_hidden = false and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
    ))
    or private.is_moderator()
  );

alter policy "Projects are viewable by everyone"
  on public.projects
  using (
    exists (
      select 1 from public.profiles p
      where p.id = projects.author_id
        and (p.is_private = false or p.id = (select auth.uid()))
    )
    or private.is_moderator()
  );
