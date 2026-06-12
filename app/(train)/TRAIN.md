# `/train` — "Trent the Tiger Trainer" — Engineering & Product Brief

> Context‑handoff doc for another agent/contributor. Describes the structure,
> design, user journey, intent, data model, current state, and the
> environment‑specific gotchas of the standalone workout app at `/train`.

## 1. What it is & why it exists
A **standalone, mobile‑first guided workout web app** for a near‑total beginner
("I have no routine and don't know what to do"). It turns *"I want to work out"*
into a guided session in three taps: **pick a focus → pick a time/equipment →
approve an auto‑generated plan → get coached rep‑by‑rep**, then logs weights and
feelings so the user can see progress over time. The brand/coach persona is
**Trent the Tiger Trainer** (a friendly cartoon tiger PT); the app speaks in
Trent's first‑person, "playful but brief" voice.

It lives at **`justinmillheim.com/train`** as a **deliberately unlinked,
`noindex`** tool inside the owner's personal portfolio repo — it is **not** in
the site nav and feels like its own app.

## 2. Tech stack & where it lives
- **Next.js 14 App Router**, **TypeScript**, **React 18**, deployed on **Vercel**.
  Repo: `justin-millheim/portfolio.website`.
- **Route‑group isolation:** the portfolio site lives in `app/(site)/` (its own
  layout with Nav/Footer/Contact). The workout app lives in `app/(train)/` — a
  separate route group with its own `layout.tsx` that renders no portfolio
  chrome, sets `robots: noindex`, and wraps everything in a `.train-root` div
  carrying the app's own dark theme. The root `app/layout.tsx` only holds
  `<html>/<body>`, global analytics scripts (GTM/Adobe/Vercel), and `{children}`.
  All existing portfolio URLs are unchanged.
- **Domain‑layer code** is in `lib/train/`; **UI** in `app/(train)/train/`.

## 3. Theme / design system (`app/(train)/train.css`)
"Burn mode" — near‑black charcoal + flame/amber, scoped under `.train-root`.
Key CSS vars: `--t-bg:#0a0a0a`, `--t-surface:#111`, `--t-flame:#ff6a32`,
`--t-amber:#ffae3d`, `--t-ink:#f4f1ea`, `--t-muted`/`--t-faint` (WCAG‑AA tuned).
Fonts: Georgia serif + JetBrains Mono (`.t-mono`). Reusable classes: `.t-wrap`
(mobile column, max 520px), `.t-btn`/`-primary`/`-ghost`/`-quiet`/`-danger`,
`.t-card`, `.t-chip`, `.t-entry`/`.t-stepper`, `.t-modal`, `.t-session-timer`,
`.t-sticky-footer`, `.t-cheer*`. Respects `prefers-reduced-motion`.

## 4. Data & storage architecture (`lib/train/`)
- **`types.ts`** — domain types: `Focus`, `Equipment`, `Constraint`, `Phase`,
  `Exercise`, `PlanItem`, `WorkoutPlan`, `SetLog`/`ExerciseLog`, `CheckIn`,
  `PhaseTimes`, `WorkoutSession`, `RunnerSnapshot`/`StepSnapshot` (resume),
  `ActiveSession`.
- **`exercises.ts`** — a hand‑curated library of **~95 exercises**. Each has:
  `id`, `name`, `emoji`, `type` (warmup/strength/cardio/mobility/cooldown),
  `focus[]`, `muscles[]`, `muscleLabel`, `equipment[]` tiers, `loaded` (uses
  weight), default sets/reps/rest/duration, a one‑line `tip`, a rich `howTo`
  (setup/steps/mistakes/easier/harder), and optional `excludedBy` constraints.
  Warm‑ups/cool‑downs are cross‑functional (tagged to multiple focuses).
- **`generator.ts`** — **deterministic, seeded** plan builder (mulberry32 RNG).
  Builds warmup (~13% of time) → circuit → cooldown (~13%) sized to the time
  budget. Equipment tiers gate moves; constraints filter; a soft **60/40
  preferred/general split** weights user‑"liked" moves. `normalizeRest` (≈20s
  standard, ≈30s heavy compounds). Exposes `generatePlan`,
  `swapItem(plan, index, blocked)`, `planItemFor(id, phase)` (for add‑exercise).
- **`storage.ts`** — the **`WorkoutStore` interface** the entire UI talks to
  (`list/get/save/remove/setFavorite/lastWeight/getPrefs/savePrefs`). `LocalStore`
  = guest/localStorage. `getStore()`/`setActiveStore()`/`useLocalStore()` swap
  adapters. Also: `ExercisePrefs` (preferred/blocked) + pure
  `applyTogglePreferred/Blocked`; `ActiveSession` cache
  (`saveActive/loadActive/clearActive`) for resume; `suggestNextWeight`
  (progressive‑overload hint).
- **`supabase.ts`** — browser client; returns `null` when env unset → app runs in
  guest mode. `cloudEnabled()`.
- **`supabase-store.ts`** — `SupabaseStore` implements `WorkoutStore` against
  Supabase + `migrateGuestDataToCloud` (lifts guest history/prefs up on first
  sign‑in).
- **`sound.ts`** — Web Audio: `playDing` (timer end), `playTick` (3‑2‑1
  countdown), `buzz` (haptic), `cheerFx`, mute state, `unlockAudio` (iOS gesture
  unlock).
- **`format.ts`** — time/volume helpers + label maps (FOCUS_LABEL,
  EQUIPMENT_LABEL, MOODS).

**Supabase** (project ref `jfnclmolpwtdfzmlukue`): **email+password** auth, **RLS**
on every table. Tables: `profiles`, `workouts` (full session as `jsonb data` +
queryable date/favorite), `prefs` (preferred/blocked text[]). Schema + RLS in
`supabase/schema.sql`. Env: `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (set in Vercel for Preview **and** Production).
Only the anon key ships; RLS does the security.

## 5. App orchestration & user journey (`app/(train)/train/TrainApp.tsx`)
`page.tsx` renders `<ConfirmProvider><TrainApp/></ConfirmProvider>`. `TrainApp`
is the **state machine**.

**Gating order on load:** `booting` (splash/null) → **recovery** (password‑reset
landing → `SetPasswordScreen`) → **onboarding** (first run → `Onboarding`) →
**auth gate** (`AuthGate`) → **app**. Auth restores a cloud session, a remembered
guest (`train.guest` flag), or shows the gate.

**Main `Screen` flow:** `home → preview → precheck → run → postcheck → summary`
(+ `history`).
1. **home** (`IntentSetup`) — Trent voice; choose focus
   (Full/Legs/Arms/Core/Cardio), duration (15/20/30/45/60), equipment
   (Bodyweight / Dumbbells / Dumbbells+Bands / Full gym), optional constraints;
   account status line; "Do a previous workout"; guest nudge; "Build it, Trent →".
2. **preview** (`PlanPreview`) — "I built you a {focus} plan." Per‑exercise
   **swap (⟳)**, **drag‑reorder (⠿, within‑phase, animated)**, tap name →
   **how‑to modal**; **＋ Add an exercise** (`AddExerciseModal`, grouped
   warm‑up/main/cool‑down, tap‑for‑how‑to, inserts into matching phase);
   **Reroll + Approve** in an always‑visible **portaled sticky footer**.
3. **precheck/postcheck** (`CheckIn`) — Trent coach bubble; energy (1–5) + mood +
   (post) notes.
4. **run** (`Runner`) — see §6.
5. **summary** (`Summary`) — Trent + stats (time, sets, volume, **skipped
   count**, warmup/workout/cooldown split, energy delta), **⭐ Save as favorite**.
6. **history** (`History`) — strength‑trend sparklines, week streak, delete, totals.

Other: `PreviousWorkoutsModal` (favorites + all‑previous drawers, "Start"),
`Onboarding` (5‑slide carousel; flag `train.onboarded.v1`), guest→account nudge
after ≥3 guest sessions (`train.guestNudge.v1`), **resume prompt** (interrupted
workout asks Resume/Discard/Not‑now instead of silently reloading).

## 6. The Runner (`components/Runner.tsx`) — the heart
- Phase state machine `subMode: work | rest | ready`. A "get ready / up next"
  beat (~10s) precedes each exercise.
- **Timestamp‑based** countdown + master session clock (survive
  backgrounded/throttled tabs, catch up on return). **Ding** at 0 + **3‑2‑1
  beeps**; 🔔/🔇 mute; **Screen Wake Lock**.
- Per‑set **weight/reps logging** with press‑and‑hold steppers, last‑weight
  pre‑fill, and a **progressive‑overload hint**.
- **👍 Prefer / 👎 Don't‑suggest** per exercise (feeds the generator's 60/40 +
  block list).
- **Forward / Previous (step‑history stack) / Skip**; **Up Next** rows
  tap‑to‑jump (with confirm).
- **Persists a `RunnerSnapshot`** every change → `saveActive` (resume).
- **Celebrations** (`Celebration.tsx`): goofy party‑hat animal critters; small
  cheer **between main exercises** and at **end of warm‑up**; **big finale parade
  when the cool‑down phase is reached** (summary stays calm).
- **Exit** → in‑app confirm **Save & see summary / Discard / Keep going** →
  builds a summary from work done (unfinished = skipped).

## 7. In‑app dialogs (no native pop‑ups)
`ConfirmProvider` exposes `useConfirm()` →
`confirm({title,message,confirmLabel,altLabel,cancelLabel,danger}) →
"confirm"|"alt"|"cancel"` and `toast()`. Rendered with **inline styles via a
direct `createPortal` to `document.body`** so it's always viewport‑centered and
can't be trapped by a transformed ancestor (this was a real bug). `TrainPortal.tsx`
does the same body‑portal trick for the sticky footer. **All** `window.confirm/alert`
were removed.

## 8. Branding: Trent
- `Trent.tsx` renders the mascot as a **hand-authored inline SVG** (chibi tiger:
  red headband + knot, whistle on a cord, navy shorts, curly striped tail,
  friendly grin). Scales crisply at every size via the `size` prop with **no
  asset/network dependency** — no PNG, no fallback needed. `TrentSays.tsx` =
  recurring **coach speech bubble**.
- *Why SVG, not the Canva render:* the sandbox can't fetch external hosts (Canva
  /S3 all 403) and pasted images arrive vision-only. The Drive download path
  works, but a single tool call truncates large content (keeps head+tail, drops
  the ~13KB middle of the 23KB JPEG), and mid-stream base64 can't be reproduced
  by hand. The vector mascot sidesteps the transfer entirely. To swap in the
  exact Canva art later, drop a **<12KB** JPG/PNG in Drive (small enough to
  survive one pass) and decode it to `public/train/trent.png`, then point
  `Trent.tsx` back at an `<img>`.
- Voice = **first‑person, present, encouraging, briefly playful** ("Trent here.
  Before we pounce…", "I built you a Legs plan", "That's a wrap! …"). Applied to
  auth gate, onboarding slide 1, check‑ins, home, plan preview, summary.

## 9. Current state & what's outstanding
- **Production `main`** is fully shipped through the
  onboarding/auth/password‑reset/resume/guest‑nudge/beeps batch (last merged PR
  #12).
- **Branch `claude/practical-maxwell-FpDJF`** (on a Vercel preview) adds the
  **Trent mascot (inline SVG) + voice pass**. No longer blocked on any asset —
  the mascot ships as vector. (Optional future polish: swap in the exact Canva
  render `DAHMTDwjHCg` once a <12KB copy is in Drive — see §8.)
- **Owner to‑dos for password reset:** allowlist `/train` redirect URLs in
  Supabase Auth, and brand the "Reset password" + "Confirm signup" email
  templates.
- **Deferred/backlog ideas (approved‑in‑principle, not built):** Personal‑Record
  detection, Quick‑Start + remembered last intent, installable **PWA + offline**,
  weekly goal + consistency heatmap, badges/milestones, difficulty progression,
  `aria-live` phase announcements, extra Trent poses, reactive/data‑driven Trent
  lines.

## 10. Working‑in‑this‑environment gotchas (important!)
- **Ephemeral sandbox:** the container reclaims `node_modules` and sometimes
  **resets the working tree** between turns. **Always** start by
  `git fetch origin <branch> && git reset --hard origin/<branch>` and `npm ci` if
  `node_modules/.bin/next` is missing.
- **No outbound network to the live domain/Canva:** `curl justinmillheim.com` →
  403. You **cannot** verify production yourself — ask the owner to eyeball it.
  File transfers must ride a connected MCP (Google Drive).
- **Verify with `npm run build`** (it runs lint + types). For generator logic,
  runtime‑test by transpiling `lib/train/*.ts` to a `.tmp` dir with
  `tsc --module commonjs` and running with node.
- **Designated dev branch:** `claude/practical-maxwell-FpDJF`. Flow = push branch
  → Vercel preview → owner tests → merge to `main` (production). Merge via
  **GitHub MCP** (`mcp__github__merge_pull_request`); its **token can expire** —
  fallback is a local `git merge --no-ff` into `main` + `git push origin main`
  (owner has authorized shipping).

## 11. File map (quick reference)
```
app/
  layout.tsx                      root html/body + analytics
  (site)/...                      portfolio (Nav/Footer chrome)
  (train)/
    layout.tsx                    noindex, .train-root wrapper
    train.css                     "burn mode" theme
    train/
      page.tsx                    <ConfirmProvider><TrainApp/>
      TrainApp.tsx                orchestrator / state machine
      components/
        IntentSetup, PlanPreview, CheckIn, Runner, Summary, History,
        ExerciseModal, PreviousWorkoutsModal, AddExerciseModal,
        AuthGate, SetPasswordScreen, Onboarding, Celebration, SessionTimer,
        ConfirmProvider, TrainPortal, Trent, TrentSays
lib/train/
  types, exercises (~95), generator, storage, supabase, supabase-store,
  sound, format
supabase/
  schema.sql, README.md
Trent.tsx                         (mascot = inline SVG, no asset needed)
.env.example
```
