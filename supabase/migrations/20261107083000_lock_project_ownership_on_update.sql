drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects
for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);
