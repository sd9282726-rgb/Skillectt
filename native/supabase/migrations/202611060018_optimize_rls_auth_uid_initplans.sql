-- Cache auth.uid() once per statement in RLS policies instead of re-evaluating it per row.
do $$
declare
  p record;
  new_using text;
  new_check text;
  statement text;
begin
  for p in
    select n.nspname, c.relname, pol.polname,
           pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') like '%auth.uid()%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') like '%auth.uid()%'
      )
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') not like '%SELECT auth.uid()%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') not like '%SELECT auth.uid()%'
      )
  loop
    new_using := p.using_expr;
    new_check := p.check_expr;
    if new_using is not null and new_using like '%auth.uid()%' and new_using not like '%SELECT auth.uid()%' then
      new_using := replace(new_using, 'auth.uid()', '( SELECT auth.uid() )');
    end if;
    if new_check is not null and new_check like '%auth.uid()%' and new_check not like '%SELECT auth.uid()%' then
      new_check := replace(new_check, 'auth.uid()', '( SELECT auth.uid() )');
    end if;
    statement := format('alter policy %I on %I.%I', p.polname, p.nspname, p.relname);
    if new_using is not null then statement := statement || format(' using (%s)', new_using); end if;
    if new_check is not null then statement := statement || format(' with check (%s)', new_check); end if;
    execute statement;
  end loop;
end
$$;
