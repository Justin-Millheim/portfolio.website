-- ============================================================================
-- /recipes ("Mise") — Supabase schema + Row-Level Security
--
-- Apply via the Supabase MCP server (preferred) or the SQL editor in the
-- Supabase dashboard. RLS is what makes this multi-user AND secure for free
-- (PRD R2 + R3): every row is owned by a user and the database itself refuses
-- cross-user reads.
--
-- This denormalized design matches lib/recipes/supabase-store.ts: each recipe
-- is one row with the full recipe (ingredients + tags inline) in a jsonb `data`
-- column, plus queryable title/updated_at. It reuses the same `profiles` table
-- and new-user trigger as supabase/schema.sql (/train), so apply that first or
-- the `create table if not exists` below is a harmless no-op alongside it.
-- ============================================================================

-- Profiles: one row per authenticated user. (Shared with /train — safe to
-- re-run; the trigger at the bottom of supabase/schema.sql already populates it.)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Recipes: one row per recipe. `data` holds the full Recipe object
-- (ingredients, tags, instructions, etc.) so the app's denormalized shape
-- round-trips without a relational mapping in Phase 1.
create table if not exists public.recipes (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  updated_at timestamptz not null default now(),
  data       jsonb not null
);

create index if not exists recipes_user_updated_idx on public.recipes (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Row-Level Security: lock the recipes table to its owner.
-- ---------------------------------------------------------------------------
alter table public.recipes enable row level security;

create policy "own recipes" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Future (Phase 3): shared / family recipe boxes.
-- When shared boxes land, add a `shared boolean` column and broaden the SELECT
-- policy to `auth.uid() = user_id OR shared = true` (or a membership table),
-- while keeping INSERT/UPDATE/DELETE owner-only. Left as a documented seam.
-- ---------------------------------------------------------------------------
