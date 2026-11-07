-- Skillect is a worldwide social platform for people aged 16 and above.

create or replace function public.profile_age_years(dob date)
returns integer
language sql
stable
set search_path = ''
as $function$
  select case
    when dob is null then null
    else pg_catalog.date_part('year', pg_catalog.age(current_date, dob))::integer
  end;
$function$;

create or replace function public.is_16_plus(dob date)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select dob is not null and public.profile_age_years(dob) >= 16;
$function$;

-- Compatibility for older clients that still call the former helper name.
create or replace function public.is_teen_eligible(dob date)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select public.is_16_plus(dob);
$function$;

create or replace function public.enforce_teen_onboarding()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.onboarded is true then
    if new.date_of_birth is null then
      raise exception 'date_of_birth is required to complete onboarding';
    end if;
    if not public.is_16_plus(new.date_of_birth) then
      raise exception 'Skillect is available to people aged 16 and above';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_teen_onboarding on public.profiles;
create trigger profiles_teen_onboarding
  before insert or update of onboarded, date_of_birth on public.profiles
  for each row execute function public.enforce_teen_onboarding();

revoke all on function public.profile_age_years(date) from public, anon;
revoke all on function public.is_16_plus(date) from public, anon;
revoke all on function public.is_teen_eligible(date) from public, anon;
grant execute on function public.profile_age_years(date) to authenticated;
grant execute on function public.is_16_plus(date) to authenticated;
grant execute on function public.is_teen_eligible(date) to authenticated;
