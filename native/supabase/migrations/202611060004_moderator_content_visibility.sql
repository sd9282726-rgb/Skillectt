-- Moderator-controlled content visibility and one active appeal per account.
begin;
alter table public.posts add column if not exists moderation_hidden boolean not null default false;
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Visible posts are viewable by everyone"
on public.posts for select to public
using (moderation_hidden = false or private.is_moderator());
drop policy if exists "Moderators can hide or restore posts" on public.posts;
create policy "Moderators can hide or restore posts"
on public.posts for update to authenticated
using (private.is_moderator())
with check (private.is_moderator());
create or replace function private.guard_post_moderation_visibility()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.moderation_hidden is distinct from old.moderation_hidden and not private.is_moderator() then
  raise exception 'Only moderators can change post visibility.' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function private.guard_post_moderation_visibility() from public,anon,authenticated;
drop trigger if exists guard_post_moderation_visibility on public.posts;
create trigger guard_post_moderation_visibility before update of moderation_hidden on public.posts
for each row execute function private.guard_post_moderation_visibility();
create unique index if not exists moderation_one_open_appeal_per_user
on public.moderation_appeals(user_id) where status in ('pending','under_review');
commit;
