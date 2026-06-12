-- ============================================================================
-- /tote ("Tote") — Supabase schema + Row-Level Security
--
-- Apply via the Supabase MCP server (preferred) or the SQL editor in the
-- Supabase dashboard. RLS is what makes this multi-user AND secure for free:
-- every row is owned by a user and the database itself refuses cross-user reads.
--
-- Denormalized to match lib/tote/supabase-store.ts: each entity is one row with
-- the full object (items / lines inline) in a jsonb `data` column, plus a few
-- queryable columns. Reuses the shared `profiles` table + new-user trigger from
-- supabase/schema.sql (/train); apply that first or the create-if-not-exists
-- below is a harmless no-op alongside it.
-- ============================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Grocery lists: one row per list; items live inside `data`.
create table if not exists public.tote_lists (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data       jsonb not null
);
create index if not exists tote_lists_user_idx on public.tote_lists (user_id, created_at);

-- Recipes: one row per recipe; ingredient lines + steps live inside `data`.
create table if not exists public.tote_recipes (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default '',
  updated_at timestamptz not null default now(),
  data       jsonb not null
);
create index if not exists tote_recipes_user_idx on public.tote_recipes (user_id, name);

-- Meal plan: one row per assigned (date, slot).
create table if not exists public.tote_plan (
  id      text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date    date not null,
  slot    text not null,
  data    jsonb not null
);
create index if not exists tote_plan_user_date_idx on public.tote_plan (user_id, date);

-- ---------------------------------------------------------------------------
-- Row-Level Security: lock every table to its owner.
-- ---------------------------------------------------------------------------
alter table public.tote_lists   enable row level security;
alter table public.tote_recipes enable row level security;
alter table public.tote_plan    enable row level security;

create policy "own tote_lists"   on public.tote_lists   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tote_recipes" on public.tote_recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tote_plan"    on public.tote_plan    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Future (sharing): a household could share a list by adding a membership
-- table (list_id, user_id) and broadening the tote_lists SELECT policy to
-- "owner OR member". Left as a documented seam; v1 is solo cloud sync.
-- ---------------------------------------------------------------------------
