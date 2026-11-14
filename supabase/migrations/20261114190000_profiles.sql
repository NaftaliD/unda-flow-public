-- Increment 0: profiles, roles, is_admin(), signup trigger, keep_alive.

create type public.user_role as enum ('user', 'admin');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale       text not null default 'en' check (locale in ('en', 'he')),
  role         public.user_role not null default 'user',
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Clients may read their own row and edit only display_name / locale.
-- Rows are created by the signup trigger and removed via auth.users cascade.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, locale) on public.profiles to authenticated;

create policy "profiles: select own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- is_admin(): used by RLS policies on shared content in later increments.
-- ---------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Role lock (belt and braces on top of the column grants above): only an admin
-- may change a role through the API. Direct database access (no JWT, e.g. the
-- dashboard SQL editor or migrations) is allowed, which is how the first admin
-- is made.
-- ---------------------------------------------------------------------------
create function public.profiles_protect_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'only an admin can change a role' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.profiles_protect_role();

-- Trigger functions are never called by API roles; do not rely on default EXECUTE grants.
revoke execute on function public.profiles_protect_role() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create a profile on signup.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- keep_alive: one public-read row so a scheduled workflow can ping the project
-- (the free plan pauses after a week of inactivity). No write policies.
-- ---------------------------------------------------------------------------
create table public.keep_alive (
  id        smallint primary key,
  pinged_at timestamptz not null default now()
);

insert into public.keep_alive (id) values (1);

alter table public.keep_alive enable row level security;

revoke all on public.keep_alive from anon, authenticated;
grant select on public.keep_alive to anon, authenticated;

create policy "keep_alive: public read"
  on public.keep_alive for select to anon, authenticated
  using (true);
