-- Audit moderator decisions on text safety cases.
create or replace function private.audit_text_case_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.reviewed_by is not null then
    insert into public.moderation_actions(moderator_id,target_user_id,target_type,target_id,action,reason)
    values(new.reviewed_by,new.user_id,'text_case',new.id,'text_case_' || new.status,coalesce(new.moderator_note,new.reason));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_text_case_review() from public,anon,authenticated;
drop trigger if exists audit_text_case_status on public.moderation_text_cases;
create trigger audit_text_case_status after update of status on public.moderation_text_cases
for each row execute function private.audit_text_case_review();
