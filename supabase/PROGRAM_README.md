# /program — "The Block" cloud sync + PWA

Like `/train`, The Block is **fully coded and wired**. It runs in **guest** mode
(on-device `localStorage`, fully offline) out of the box. Two owner-run steps
turn on cross-device cloud sync; one phone step installs it as an app.

Project ref: `jfnclmolpwtdfzmlukue` (the **same** Supabase project as `/train`).

## 1. Apply the schema
Run `supabase/program_schema.sql` in the Supabase SQL editor (or via the Supabase
MCP server). It adds three new tables — `program_sessions`, `program_progress`,
`program_prefs` — each locked to its owner by Row-Level Security. It reuses the
`profiles` table + `handle_new_user()` trigger from `supabase/schema.sql`, so
apply that one first (it already is, for `/train`).

## 2. Environment variables
Already set for `/train` — **nothing new to add**. The same
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` power both apps
(only the public anon key reaches the browser; RLS gates every row).

## 3. Auth redirect allowlist
In **Supabase → Authentication → URL Configuration**, add to the redirect
allowlist (so password-reset / confirm links land back in the app):

```
https://justinmillheim.com/program
http://localhost:3000/program
```

## Install it on your phone (PWA)
The Block is a Progressive Web App, so it installs to your home screen — no app
store, same code:

- **iPhone (Safari):** open `justinmillheim.com/program` → Share → **Add to Home
  Screen**.
- **Android (Chrome):** open the page → menu → **Install app** / **Add to Home
  Screen**.

Once installed it launches **full-screen** (no browser chrome), keeps an app
**icon**, and **works offline** — guest data is local; cloud data syncs when
you're back online.

### How it's wired (for reference)
- `app/(program)/layout.tsx` — `noindex`, `.program-root`, manifest + theme.
- `public/program/manifest.webmanifest`, `public/program/sw.js`,
  `public/program/icon-*.png` — the PWA assets. The service worker is scoped to
  `/program` only (`Service-Worker-Allowed` header in `next.config.mjs`), so it
  can never touch the rest of the portfolio site.
- `lib/program/supabase.ts` / `supabase-store.ts` — `SupabaseStore` implements
  the same `ProgramStore` interface as `LocalStore`, plus guest→cloud migration
  on first sign-in (history, progress, and substitution prefs all lift up).
- Regenerate the icons anytime with `node scripts/gen-program-icons.mjs`.

### The three source `TBD`s (resolved)
From `Justin_Millheim_Workout_Plan.xlsx`, encoded as one-line config values in
`lib/program/program.ts`:
- **90/90 Hip Lift** — no reps in source → quality/feel default **5 each side**.
- **Day-4 Plank Hold** — source cell garbled (`ustin`) → default **30 sec**.
- **Quick Ropes** — kept the source name; the coach's own demo video disambiguates.

Each is a single value in `program.ts` (and the matching note in `exercises.ts`).
Change it once if the coach confirms otherwise.
