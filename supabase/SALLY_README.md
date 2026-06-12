# /sally — "Sally the Songbird" — setup & activation

A guided, conversational songwriting studio: Sally (an opinionated cartoon
songbird) walks a song through five gated phases — intake → outline → draft
(with two silent quality audits) → sectional refine → a Suno-ready production
prompt under 1,000 characters. Everything persists: songs, versioned outlines,
versioned drafts, prompts, and the full conversation.

The app is live at `/sally` the moment this branch deploys, but it has two
activation steps (run them yourself — they can't run from a Claude Code web
session):

## 1. The Anthropic API key (required for Sally to talk at all)

All Claude calls run through Next.js server routes (`app/api/sally/*`) — the
key never reaches the browser. In Vercel (Project → Settings → Environment
Variables) **and** your local `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-…
```

Until it's set, the app runs and persists fine but every Sally action returns
a friendly "studio isn't wired up yet" message.

**Model dial:** `lib/sally/models.ts` maps each step to a model — drafting and
the two audits on `claude-opus-4-8` (quality matters most there),
conversation/outline/Suno on `claude-sonnet-4-6`, utility trims on
`claude-haiku-4-5`. Point the draft tier at Sonnet to save money, or leave
Opus on for important gift songs.

## 2. Supabase (optional — guest mode works without it)

Same project as the other apps (`jfnclmolpwtdfzmlukue`), same env vars
(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — if you've
already activated /train, /recipes, or /tote, only the schema is new:

- Run `supabase/sally_schema.sql` in the Supabase SQL editor (or via the
  Supabase MCP server). It creates `songs`, `outlines`, `drafts`,
  `suno_prompts`, `sally_messages`, `sally_tags`, `sally_song_tags`, all
  locked to their owner by RLS.

Without Supabase env vars the studio runs in **guest mode** (on-device
localStorage). On first sign-in, guest songs migrate up to the cloud
automatically. When Supabase IS configured, the API routes also require a
signed-in user — that's what protects your Anthropic key from strangers
hitting the endpoints.

## How it's wired (for reference)

- `lib/sally/brain/` — **Sally's Brain**: versioned prompt modules (persona,
  per-phase behavior, craft knowledge, the two audit checklists). All craft
  knowledge is baked in; nothing is fetched from external storage at runtime.
  Tune the songwriting here, never in component code.
- `app/api/sally/draft` — the Phase 2 silent pipeline: draft → pre-draft
  anti-patterns audit → post-draft critical audit → deliver. Audit findings go
  to the server log only (check Vercel function logs to tune the Brain); the
  writer never sees the machinery.
- `app/api/sally/suno` — enforces the ≤1,000-character cap and the
  no-artist-names rule in app code after generation (compress pass on Haiku,
  then a programmatic comma-boundary trim as last resort).
- `lib/sally/meter.ts` — the Syllable Meter: heuristic per-line syllable
  counts against per-section budgets, computed in app code. A guide, not
  gospel; toggleable on the lyric sheet.
- `lib/sally/store.ts` / `supabase-store.ts` — the same storage seam as
  /train and /recipes: the UI talks to one interface, guest and cloud
  adapters swap underneath.
- Gates are app logic: no outline approval → no drafting; any unlocked
  section → no Suno prompt. The model is never trusted to enforce them.
