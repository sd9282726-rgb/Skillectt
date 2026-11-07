-- Keep email and date of birth out of public profile reads.
-- The DOB column remains writable by the authenticated owner so the onboarding
-- trigger can enforce the minimum age without exposing the value via PostgREST.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

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
