-- ============================================================================
-- /train workout companion — Supabase schema + Row-Level Security
-- Project ref: jfnclmolpwtdfzmlukue
--
-- Apply via the Supabase MCP server (preferred) or the SQL editor in the
-- Supabase dashboard. RLS is what makes this multi-user AND secure for free:
-- every row is owned by a user and the database itself refuses cross-user reads.
--
-- This denormalized design matches lib/train/supabase-store.ts: each workout is
-- one row with the full session in a jsonb `data` column (plus queryable
-- date/favorite), and preferences live in a per-user `prefs` row.
-- ============================================================================

-- 1) Profiles: one row per authenticated user.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- 2) Workouts: one row per completed session (id is the app's session id, e.g. w_123).
create table if not exists public.workouts (
  id        text primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  date      timestamptz not null default now(),
  favorite  boolean not null default false,
  data      jsonb not null
);

-- 3) Preferences: preferred / blocked exercise ids per user.
create table if not exists public.prefs (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  preferred text[] not null default '{}',
  blocked   text[] not null default '{}'
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Row-Level Security: lock every table to its owner.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.prefs    enable row level security;

create policy "own profile - select" on public.profiles for select using (auth.uid() = id);
create policy "own profile - insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile - update" on public.profiles for update using (auth.uid() = id);

create policy "own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own prefs" on public.prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
