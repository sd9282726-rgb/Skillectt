-- Capture a limited text/media snapshot for reported content. Only moderators can read it.
create table if not exists public.moderation_evidence (
  report_id uuid primary key references public.reports(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  content_snapshot text,
  media_url_snapshot text,
  captured_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '180 days')
);
alter table public.moderation_evidence enable row level security;
grant select on public.moderation_evidence to authenticated;
drop policy if exists "Moderators view report evidence" on public.moderation_evidence;
create policy "Moderators view report evidence"
on public.moderation_evidence for select to authenticated
using (private.is_moderator());
create or replace function private.capture_report_evidence()
returns trigger language plpgsql security definer set search_path=''
as $$
declare owner_id uuid; content_text text; media_url text;
begin
 if new.target_type='post' then
  select author_id,content,image_url into owner_id,content_text,media_url from public.posts where id=new.target_id;
 elsif new.target_type='comment' then
  select author_id,content into owner_id,content_text from public.comments where id=new.target_id;
 elsif new.target_type='message' then
  select sender_id,content into owner_id,content_text from public.messages where id=new.target_id;
 end if;
 if owner_id is not null then
  insert into public.moderation_evidence(report_id,target_user_id,target_type,content_snapshot,media_url_snapshot)
  values(new.id,coalesce(new.target_user_id,owner_id),new.target_type,content_text,media_url)
  on conflict(report_id) do nothing;
  if new.target_user_id is null then update public.reports set target_user_id=owner_id where id=new.id; end if;
 elsif new.target_user_id is not null then
  insert into public.moderation_evidence(report_id,target_user_id,target_type,content_snapshot)
  values(new.id,new.target_user_id,new.target_type,new.details)
  on conflict(report_id) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.capture_report_evidence() from public,anon,authenticated;
drop trigger if exists capture_evidence_on_report on public.reports;
create trigger capture_evidence_on_report after insert on public.reports
for each row execute function private.capture_report_evidence();
