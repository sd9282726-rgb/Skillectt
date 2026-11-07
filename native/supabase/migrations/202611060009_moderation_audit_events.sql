-- Audit all moderator decisions: hiding/restoring content, resolving reports, and reviewing appeals.
create or replace function private.audit_moderation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  moderator uuid;
  target_user uuid;
  target_kind text;
  target uuid;
  action_name text;
  action_reason text;
begin
  if tg_table_name = 'posts' then
    if new.moderation_hidden is not distinct from old.moderation_hidden then return new; end if;
    moderator := auth.uid();
    target_user := new.author_id;
    target_kind := 'post';
    target := new.id;
    action_name := case when new.moderation_hidden then 'post_hidden' else 'post_restored' end;
    action_reason := 'Moderator changed post visibility';
  elsif tg_table_name = 'comments' then
    if new.moderation_hidden is not distinct from old.moderation_hidden then return new; end if;
    moderator := auth.uid();
    target_user := new.author_id;
    target_kind := 'comment';
    target := new.id;
    action_name := case when new.moderation_hidden then 'comment_hidden' else 'comment_restored' end;
    action_reason := 'Moderator changed comment visibility';
  elsif tg_table_name = 'reports' then
    if new.status is not distinct from old.status then return new; end if;
    moderator := auth.uid();
    target_kind := new.target_type;
    target := new.target_id;
    action_name := 'report_' || new.status;
    action_reason := 'Report status changed by moderator: ' || new.reason;
  elsif tg_table_name = 'moderation_appeals' then
    if new.status is not distinct from old.status then return new; end if;
    moderator := new.reviewed_by;
    target_user := new.user_id;
    target_kind := 'appeal';
    target := new.id;
    action_name := 'appeal_' || new.status;
    action_reason := coalesce(new.moderator_note, 'Appeal reviewed');
  else
    return new;
  end if;
  if moderator is not null then
    insert into public.moderation_actions(moderator_id,target_user_id,target_type,target_id,action,reason)
    values(moderator,target_user,target_kind,target,action_name,action_reason);
  end if;
  return new;
end;
$$;
revoke all on function private.audit_moderation_event() from public,anon,authenticated;
drop trigger if exists audit_post_visibility on public.posts;
create trigger audit_post_visibility after update of moderation_hidden on public.posts
for each row execute function private.audit_moderation_event();
drop trigger if exists audit_comment_visibility on public.comments;
create trigger audit_comment_visibility after update of moderation_hidden on public.comments
for each row execute function private.audit_moderation_event();
drop trigger if exists audit_report_status on public.reports;
create trigger audit_report_status after update of status on public.reports
for each row execute function private.audit_moderation_event();
drop trigger if exists audit_appeal_status on public.moderation_appeals;
create trigger audit_appeal_status after update of status on public.moderation_appeals
for each row execute function private.audit_moderation_event();
