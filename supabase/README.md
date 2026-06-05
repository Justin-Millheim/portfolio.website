# /train — Supabase wiring (Phase 4)

The app ships running on an **on-device (localStorage)** store so it works the
moment it deploys. To turn on **multi-user cloud sync** (history that follows you
across devices, login, secure isolation), follow these steps. None of this can be
done from a Claude Code *web* session — it needs your local terminal and your
Supabase credentials.

Project ref: `jfnclmolpwtdfzmlukue`

## 1. Apply the schema
Either run `supabase/schema.sql` in the Supabase dashboard SQL editor, or, after
adding the Supabase MCP server locally:

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
`schema.sql`) gates every row. Never expose the `service_role` key.

## 3. Flip the store
Install the client and implement the adapter:

```
npm install @supabase/supabase-js @supabase/ssr
```

Then add a `SupabaseStore` implementing the `WorkoutStore` interface in
`lib/train/storage.ts`, and in `getStore()` return it when the env vars are
present and a user is signed in (fall back to `LocalStore` otherwise). Because
all UI talks only to `WorkoutStore`, no screen code changes.

A one-time **import** button (already in the History screen) lets you push your
existing on-device history up to the cloud after signing in.
