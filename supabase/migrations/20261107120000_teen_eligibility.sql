-- Teen eligibility for Skillect (India-focused teen platform)
-- Age band: 13 inclusive through 19 inclusive at onboarding time.
-- DOB is stored on profiles but must not be exposed on public profile views.

create or replace function public.profile_age_years(dob date)
returns integer
language sql
immutable
as $$
  select case
    when dob is null then null
    else date_part('year', age(current_date, dob))::integer
  end;
$$;

create or replace function public.is_teen_eligible(dob date)
returns boolean
language sql
immutable
as $$
  select dob is not null
    and public.profile_age_years(dob) between 13 and 19;
$$;

-- Block completing onboarding without a valid teen DOB.
create or replace function public.enforce_teen_onboarding()
returns trigger
language plpgsql
as $$
begin
  if new.onboarded is true then
    if new.date_of_birth is null then
      raise exception 'date_of_birth is required to complete onboarding';
    end if;
    if not public.is_teen_eligible(new.date_of_birth) then
      raise exception 'Skillect is only available to users aged 13 to 19';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_teen_onboarding on public.profiles;
create trigger profiles_teen_onboarding
  before insert or update of onboarded, date_of_birth on public.profiles
  for each row execute function public.enforce_teen_onboarding();

grant execute on function public.profile_age_years(date) to authenticated;
grant execute on function public.is_teen_eligible(date) to authenticated;
