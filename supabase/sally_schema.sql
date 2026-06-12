-- ============================================================================
-- /sally — "Sally the Songbird" — Supabase schema + Row-Level Security
-- Project ref: jfnclmolpwtdfzmlukue  (SAME project as /train, new tables)
--
-- Apply via the Supabase MCP server (preferred) or the SQL editor in the
-- Supabase dashboard. RLS keys every table on user_id from day one (PRD §12):
-- v1 is single-user, but this is the seam that makes the app shareable later
-- without a migration.
--
-- Mirrors lib/sally/supabase-store.ts. IDs are app-generated uuid strings
-- (text pk, matching the /program and /recipes convention). The five-phase
-- state machine lives on songs.current_phase; outlines and drafts are
-- versioned append-only so nothing is ever lost (PRD §18).
--
-- Reuses the public.profiles table + handle_new_user() trigger created by
-- supabase/schema.sql (the /train schema). Apply that first.
-- ============================================================================

-- 1) Songs: one row per song. The resume point is current_phase (1–4).
create table if not exists public.songs (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null default 'Untitled song',
  mode             text,                       -- gift | anthemic | confessional_rap | double_entendre
  style_reference  text,                       -- the locked reference; null if blind
  style_blind      boolean not null default false,
  style_locked     boolean not null default false,
  emotional_core   text,
  central_metaphor text,
  current_phase    integer not null default 1, -- 1–4
  status           text not null default 'in_progress', -- in_progress | complete | archived
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2) Outlines: versioned per song; `approved` is the Phase 1 → 2 gate.
create table if not exists public.outlines (
  id               text primary key,
  song_id          text not null references public.songs (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  version          integer not null,
  working_title    text not null default '',
  emotional_core   text not null default '',
  emotional_arc    text not null default '',
  central_metaphor text not null default '',
  late_turn        text,
  structure        jsonb not null default '[]',  -- ordered [{label, summary}]
  chorus_concept   text not null default '',
  reasoning        text not null default '',
  approved         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- 3) Drafts: versioned per song. `sections` holds the full lyric structure
--    [{label, kind, delivery_cue, lines:[...], locked}] — lock state is the
--    Phase 3 → 4 gate. lyric_sheet is the rendered copyable text.
create table if not exists public.drafts (
  id             text primary key,
  song_id        text not null references public.songs (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  draft_version  integer not null,
  title          text not null default '',
  lyric_sheet    text not null default '',
  sections       jsonb not null default '[]',
  creative_notes jsonb not null default '[]',  -- Sally's 2–3 choice notes
  weak_lines     jsonb not null default '[]',  -- post-audit callouts
  created_at     timestamptz not null default now()
);

-- 4) Suno prompts: ≤1000 chars enforced in app code before save (PRD §11).
create table if not exists public.suno_prompts (
  id         text primary key,
  song_id    text not null references public.songs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  prompt     text not null,
  char_count integer not null,
  variations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- 5) Messages: the Sally ↔ writer conversation log, per phase. This is what
--    lets a song resume mid-conversation with full context (PRD §12 notes).
create table if not exists public.sally_messages (
  id         text primary key,
  song_id    text not null references public.songs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  phase      integer not null,
  role       text not null,                   -- sally | writer
  content    text not null,
  created_at timestamptz not null default now()
);

-- 6) Tags + song_tags: mood/theme browsing + the living reference corpus seam
--    (PRD §7, v1.2). Created now so the schema never needs a migration.
create table if not exists public.sally_tags (
  id      text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name    text not null
);

create table if not exists public.sally_song_tags (
  song_id text not null references public.songs (id) on delete cascade,
  tag_id  text not null references public.sally_tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (song_id, tag_id)
);

create index if not exists songs_user_updated_idx on public.songs (user_id, updated_at desc);
create index if not exists outlines_song_version_idx on public.outlines (song_id, version desc);
create index if not exists drafts_song_version_idx on public.drafts (song_id, draft_version desc);
create index if not exists suno_song_created_idx on public.suno_prompts (song_id, created_at desc);
create index if not exists sally_messages_song_idx on public.sally_messages (song_id, created_at);

-- ---------------------------------------------------------------------------
-- Row-Level Security: lock every table to its owner.
-- ---------------------------------------------------------------------------
alter table public.songs enable row level security;
alter table public.outlines enable row level security;
alter table public.drafts enable row level security;
alter table public.suno_prompts enable row level security;
alter table public.sally_messages enable row level security;
alter table public.sally_tags enable row level security;
alter table public.sally_song_tags enable row level security;

create policy "own songs" on public.songs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own outlines" on public.outlines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own drafts" on public.drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own suno prompts" on public.suno_prompts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sally messages" on public.sally_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sally tags" on public.sally_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sally song tags" on public.sally_song_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
