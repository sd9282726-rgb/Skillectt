-- Allow message and profile reports to identify the reported account without exposing private message content.
alter table public.reports add column if not exists target_user_id uuid references auth.users(id) on delete set null;
create index if not exists reports_target_user_idx on public.reports(target_user_id) where target_user_id is not null;
