-- MetriX Train: Supabase schema (v1). Paste into Supabase > SQL Editor > New query > Run.
-- Design: local-first app. Each record is one row with a jsonb body, so the app can change
-- its data shape without migrations. Sync merges by record id and updated_at.
-- Row level security makes every user see only their own rows.

-- 1. People ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  program_id text not null default 'main',
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id text primary key,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. User data --------------------------------------------------------------
create table if not exists public.sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  finished_at timestamptz,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.day_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  daily jsonb,
  food jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- settings, myfoods, meas, notes, notelog, active workout, timer
create table if not exists public.kv (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- 3. Row level security -------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.sessions enable row level security;
alter table public.day_logs enable row level security;
alter table public.kv enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "assigned program read" on public.programs;
create policy "assigned program read" on public.programs for select to authenticated
  using (id = (select program_id from public.profiles where id = auth.uid()));

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own day logs" on public.day_logs;
create policy "own day logs" on public.day_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own kv" on public.kv;
create policy "own kv" on public.kv for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. Create a profile automatically for every new login -------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Private photo storage (one folder per user) --------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
