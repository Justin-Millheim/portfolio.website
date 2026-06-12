-- ============================================================================
-- /program — "The Block" — Supabase schema + Row-Level Security
-- Project ref: jfnclmolpwtdfzmlukue  (SAME project as /train, new tables)
--
-- Apply via the Supabase MCP server (preferred) or the SQL editor in the
-- Supabase dashboard. RLS is what makes this multi-user AND secure for free:
-- every row is owned by a user and the database itself refuses cross-user reads.
--
-- Mirrors lib/program/supabase-store.ts: each session is one row with the full
-- SessionLog in a jsonb `data` column (plus queryable block/week/day/date/
-- favorite); the rotation pointer is one row per user; prefs (substitution
-- choices + prefer/avoid) are one row per user.
--
-- Reuses the public.profiles table + handle_new_user() trigger already created
-- by supabase/schema.sql (the /train schema). Apply that first, or uncomment the
-- profiles block below if this is a standalone project.
-- ============================================================================

-- -- profiles (only if not already created by the /train schema):
-- create table if not exists public.profiles (
--   id           uuid primary key references auth.users (id) on delete cascade,
--   display_name text,
--   created_at   timestamptz not null default now()
-- );

-- 1) Program sessions: one row per logged Day × Week (id is the app's session id, e.g. p_123).
create table if not exists public.program_sessions (
  id        text primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  block     integer not null default 1,
  week      integer not null,
  day       integer not null,
  date      timestamptz not null default now(),
  favorite  boolean not null default false,
  data      jsonb not null
);

-- 2) Program progress: one row per user — the guided-rotation pointer.
create table if not exists public.program_progress (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  block_number     integer not null default 1,
  current_week     integer not null default 1,
  completed        jsonb not null default '[]',
  block_started_at timestamptz not null default now()
);

-- 3) Program prefs: substitution choices + prefer/avoid lists, one row per user.
create table if not exists public.program_prefs (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  subs      jsonb not null default '{}',
  preferred text[] not null default '{}',
  avoided   text[] not null default '{}'
);

create index if not exists program_sessions_user_date_idx on public.program_sessions (user_id, date desc);
create index if not exists program_sessions_user_block_idx on public.program_sessions (user_id, block, week, day);

-- ---------------------------------------------------------------------------
-- Row-Level Security: lock every table to its owner.
-- ---------------------------------------------------------------------------
alter table public.program_sessions enable row level security;
alter table public.program_progress enable row level security;
alter table public.program_prefs    enable row level security;

create policy "own program sessions" on public.program_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own program progress" on public.program_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own program prefs" on public.program_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
