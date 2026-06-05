-- ============================================================================
-- /train workout companion — Supabase schema + Row-Level Security
-- Project ref: jfnclmolpwtdfzmlukue
--
-- Apply via the Supabase MCP server (preferred) or the SQL editor in the
-- Supabase dashboard. RLS is what makes this multi-user AND secure for free:
-- every row is owned by a user and the database itself refuses cross-user reads.
-- ============================================================================

-- 1) Profiles: one row per authenticated user.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

-- 2) A workout session.
create table if not exists public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  date            timestamptz not null default now(),
  focus           text not null,
  duration_target int  not null,
  equipment       text not null,
  constraints     text[] not null default '{}',
  status          text not null default 'in_progress',
  plan            jsonb not null,           -- the approved WorkoutPlan
  pre_energy      int,
  pre_mood        text,
  post_energy     int,
  post_mood       text,
  notes           text,
  total_seconds   int  not null default 0,
  phase_warmup_s  int  not null default 0,
  phase_circuit_s int  not null default 0,
  phase_cooldown_s int not null default 0,
  completed_at    timestamptz
);

-- 3) Per-exercise log within a workout.
create table if not exists public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,                -- references the static library id
  phase       text not null,
  position    int  not null,
  skipped     boolean not null default false
);

-- 4) Per-set log.
create table if not exists public.set_logs (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  set_number          int not null,
  weight              numeric,
  reps                int,
  rpe                 int,
  completed           boolean not null default false
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists we_workout_idx on public.workout_exercises (workout_id);
create index if not exists sl_we_idx on public.set_logs (workout_exercise_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security: lock every table to its owner.
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.workouts            enable row level security;
alter table public.workout_exercises   enable row level security;
alter table public.set_logs            enable row level security;

-- Profiles
create policy "own profile - select" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile - upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = id);

-- Generic owner policies for the data tables.
create policy "own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workout_exercises" on public.workout_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own set_logs" on public.set_logs
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
