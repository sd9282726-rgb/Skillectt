-- Moderator-only comment visibility controls.
begin;
alter table public.comments add column if not exists moderation_hidden boolean not null default false;
drop policy if exists "Comments are viewable by everyone" on public.comments;
create policy "Visible comments are viewable by everyone"
on public.comments for select to public
using (moderation_hidden = false or private.is_moderator());
drop policy if exists "Moderators can hide or restore comments" on public.comments;
create policy "Moderators can hide or restore comments"
on public.comments for update to authenticated
using (private.is_moderator())
with check (private.is_moderator());
create or replace function private.guard_comment_moderation_visibility()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.moderation_hidden is distinct from old.moderation_hidden and not private.is_moderator() then
  raise exception 'Only moderators can change comment visibility.' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function private.guard_comment_moderation_visibility() from public,anon,authenticated;
drop trigger if exists guard_comment_moderation_visibility on public.comments;
create trigger guard_comment_moderation_visibility before update of moderation_hidden on public.comments
for each row execute function private.guard_comment_moderation_visibility();
commit;
