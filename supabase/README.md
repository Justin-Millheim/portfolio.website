# /train — Supabase cloud sync (Phase 4)

Cloud sync is **fully coded and wired** — it just needs two activation steps you
run yourself (they can't run from a Claude Code *web* session): applying the
schema and adding your Supabase keys. Until those are set, the tool runs in
**guest** mode (on-device localStorage) and the auth gate offers "Continue as
guest" only.

Project ref: `jfnclmolpwtdfzmlukue`

## 1. Apply the schema
Run `supabase/schema.sql` in the Supabase dashboard SQL editor, or, after adding
the Supabase MCP server locally:

```
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=jfnclmolpwtdfzmlukue"
claude /mcp        # select supabase, authenticate
```

…then ask Claude (locally) to apply `supabase/schema.sql`.

## 2. Add environment variables
In Vercel (Project → Settings → Environment Variables) **and** a local
`.env.local` (git-ignored), set the values from Supabase → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://jfnclmolpwtdfzmlukue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
```

Only the public *anon* key reaches the browser — that's safe **because** RLS (in
`schema.sql`) gates every row. Never expose the `service_role` key. Redeploy
after adding them in Vercel.

## 3. Account creation — avoid the "need a Vercel account" trap ⚠️
If new users get bounced to a **Vercel login page** when creating an account,
it's one of these (all dashboard config, not code):

1. **Turn OFF email confirmation (recommended for this app).**
   **Authentication → Providers → Email → disable "Confirm email."** Then sign-up
   logs the user straight in — no email round-trip, no link to misroute. This is
   the simplest, friction-free fix and matches the "jump right in" intent.
2. **Set the right URLs.** **Authentication → URL Configuration:**
   - **Site URL** = `https://justinmillheim.com` (your real public domain — NOT a
     `*.vercel.app` preview, which is Vercel-protected).
   - **Redirect URLs** must include `https://justinmillheim.com/train`
     (and `http://localhost:3000/train` for local dev). This is **required** for
     password-reset and (if kept on) email-confirmation links to land back in the
     app instead of a protected URL.
3. **Disable Vercel Deployment Protection on the public site.**
   **Vercel → Project → Settings → Deployment Protection → Vercel
   Authentication = Disabled** for Production. If it's on, every visitor (and
   every Supabase email link pointing at the deployment) hits a Vercel SSO wall —
   exactly the "need a Vercel account to sign up" symptom.

The app code already passes `emailRedirectTo: <origin>/train` on sign-up, so if
you keep confirmation on, step 2's allowlist is what makes the link work.

## 4. Password recovery (forgot password)
The whole flow is **already coded** — request form, the recovery-link handler,
and the "set a new password" screen. To turn it on you only need config:

1. **URLs (same as step 3).** The reset link returns the user to
   `https://justinmillheim.com/train`, so that URL **must** be in
   **Authentication → URL Configuration → Redirect URLs**, and **Site URL** must
   be your real domain (not a Vercel preview). Without this the link won't route.
2. **Vercel Deployment Protection OFF** (step 3) — otherwise the link hits a
   Vercel login wall.
3. **Email delivery — built-in (current choice).** Supabase sends the reset email
   automatically via its built-in service. No extra setup. Note it's
   **rate-limited** (~3–4/hr on free tier) and uses a generic sender — fine for a
   personal app. To upgrade later: **Authentication → Emails → SMTP Settings** and
   plug in a provider (Resend has a generous free tier and great deliverability).
4. **Brand the email (optional but recommended).** Paste
   `supabase/email-templates/reset-password.html` into **Authentication → Emails →
   "Reset Password" → Message body** (Source/HTML mode). Keep the
   `{{ .ConfirmationURL }}` variable intact. Suggested subject:
   `Reset your Trent password 🐯`.

**How it works end to end:** AuthGate "Forgot password?" →
`resetPasswordForEmail(email, { redirectTo: <origin>/train })` → Supabase emails a
one-time link → user opens it (works on any device — the client uses the implicit
flow, `flowType: "implicit"` in `lib/train/supabase.ts`) → the client detects the
recovery token and fires `PASSWORD_RECOVERY` → `SetPasswordScreen` →
`updateUser({ password })`. An **expired or already-used link** is detected and
the gate opens straight into the resend form with a friendly note.

## That's it
With keys present, the gate shows **Sign in / Create account / Continue as
guest**. On your first sign-in, any workouts and preferences you created as a
guest on that device are **migrated up to the cloud automatically**
(`migrateGuestDataToCloud`). From then on, history, favorites, and your
Prefer/Don't-suggest settings sync across every device you sign in on.

### How it's wired (for reference)
- `lib/train/supabase.ts` — browser client (null when env is unset → guest mode).
- `lib/train/supabase-store.ts` — `SupabaseStore` implements the same
  `WorkoutStore` interface as `LocalStore`, plus the guest→cloud migration.
- `lib/train/storage.ts` — `getStore()` / `setActiveStore()` swap adapters; the
  UI only ever talks to the interface, so no screen code is Supabase-aware.
- Data model: `workouts` (full session as jsonb + queryable date/favorite) and
  `prefs` (preferred/blocked arrays), both locked by RLS to `auth.uid()`.
