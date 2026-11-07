alter table public.moderation_text_cases
  drop constraint if exists moderation_text_cases_content_type_check;

alter table public.moderation_text_cases
  add constraint moderation_text_cases_content_type_check
  check (content_type = any (array['post','comment','message','profile','media_caption','project']::text[]));

drop trigger if exists require_moderated_text_for_projects on public.projects;
create trigger require_moderated_text_for_projects
before insert or update on public.projects
for each row execute function private.require_text_moderation_gateway();
