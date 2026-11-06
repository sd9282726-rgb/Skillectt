-- Audit moderator decisions on rejected media records.
create or replace function private.audit_media_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.reviewed_at is distinct from new.reviewed_at and new.reviewed_at is not null then
    insert into public.moderation_actions(moderator_id,target_user_id,target_type,target_id,action,reason)
    values(auth.uid(),new.owner_id,'media',new.id,'media_reviewed',coalesce(new.decision_reason,'Rejected media reviewed'));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_media_review() from public,anon,authenticated;
drop trigger if exists audit_media_review on public.media_assets;
create trigger audit_media_review after update of reviewed_at on public.media_assets
for each row execute function private.audit_media_review();
