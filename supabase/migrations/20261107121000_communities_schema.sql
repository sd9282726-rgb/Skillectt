-- Communities core schema (idempotent)

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category text not null default 'general',
  cover_url text,
  avatar_url text,
  topics text[] not null default '{}',
  is_private boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communities_created_at_idx on public.communities (created_at desc);
create index if not exists communities_slug_idx on public.communities (slug);
create index if not exists communities_topics_idx on public.communities using gin (topics);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- owner | moderator | member
  status text not null default 'active', -- active | pending | banned
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists community_members_user_idx on public.community_members (user_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

-- Public communities readable by all; private only by members
drop policy if exists "Public communities readable" on public.communities;
create policy "Public communities readable"
on public.communities for select
using (
  is_private = false
  or exists (
    select 1 from public.community_members cm
    where cm.community_id = communities.id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
);

drop policy if exists "Authenticated create communities" on public.communities;
create policy "Authenticated create communities"
on public.communities for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Owners update communities" on public.communities;
create policy "Owners update communities"
on public.communities for update to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.community_members cm
    where cm.community_id = communities.id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'moderator')
      and cm.status = 'active'
  )
);

drop policy if exists "Members visible" on public.community_members;
create policy "Members visible"
on public.community_members for select
using (
  exists (
    select 1 from public.communities c
    where c.id = community_members.community_id
      and (
        c.is_private = false
        or exists (
          select 1 from public.community_members me
          where me.community_id = c.id
            and me.user_id = auth.uid()
            and me.status = 'active'
        )
      )
  )
);

drop policy if exists "Users join communities" on public.community_members;
create policy "Users join communities"
on public.community_members for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    exists (
      select 1 from public.communities c
      where c.id = community_id and c.is_private = false
    )
    or role = 'owner'
  )
);

drop policy if exists "Users leave communities" on public.community_members;
create policy "Users leave communities"
on public.community_members for delete to authenticated
using (auth.uid() = user_id and role <> 'owner');

-- On create: add creator as owner and bump count
create or replace function public.handle_community_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_members (community_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active')
  on conflict (community_id, user_id) do update
    set role = 'owner', status = 'active';
  update public.communities set member_count = 1 where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_community_created on public.communities;
create trigger on_community_created
  after insert on public.communities
  for each row execute function public.handle_community_created();
