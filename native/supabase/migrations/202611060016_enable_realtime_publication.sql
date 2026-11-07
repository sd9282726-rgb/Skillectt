-- Enable Postgres Changes for the tables used by live feed, chat, and notifications.
-- RLS remains responsible for filtering each event to rows the subscriber may read.
do $$
declare
  target_table text;
begin
  foreach target_table in array array['messages','notifications','posts','comments']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end
$$;
