-- Make Skillect worldwide for people aged 16 and above.
-- Keep date_of_birth writable for the authenticated account owner, but never readable through the public profile API.

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

-- Preserve the legacy helper name for any older client while changing its policy.
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

-- Remove table-wide profile read/write grants. Public profile clients receive
-- only non-sensitive columns; DOB and email remain unavailable to both roles.
revoke select on table public.profiles from public, anon, authenticated;
revoke select (email, date_of_birth) on table public.profiles from public, anon, authenticated;
grant select (
  id, display_name, username, avatar_url, cover_url, bio, location, website,
  skills, interests, country, onboarded, is_private, created_at, updated_at
) on table public.profiles to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.profiles from public, anon, authenticated;
grant update (
  display_name, username, bio, location, website, skills, interests,
  avatar_url, cover_url, country, onboarded, is_private, date_of_birth
) on table public.profiles to authenticated;

revoke all on function public.profile_age_years(date) from public, anon;
revoke all on function public.is_16_plus(date) from public, anon;
revoke all on function public.is_teen_eligible(date) from public, anon;
grant execute on function public.profile_age_years(date) to authenticated;
grant execute on function public.is_16_plus(date) to authenticated;
grant execute on function public.is_teen_eligible(date) to authenticated;
