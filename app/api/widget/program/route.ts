// GET /api/widget/program — read-only, token-gated JSON for the iPhone home-
// screen Scriptable widget (iphone-dashboard handoff §5). Returns the UPCOMING
// session for /program ("The Block"): split, week/day, today's loaded lifts with
// last→target weights, and this-week completion.
//
// Why this isn't a plain SELECT: today's prescription (split, lifts, schemes,
// target weights) is never stored — it's computed by the program engine from the
// rotation pointer (program_progress) + prefs, then cross-referenced against
// logged history (program_sessions) for last weights. So we run the same pure
// engine the app uses, server-side.
//
// Auth model: the widget has no Supabase session, and every program_* table is
// RLS-locked to auth.uid(). So this route uses the SERVICE-ROLE key (server-only,
// bypasses RLS) scoped to a single fixed user id, and gates access with a shared
// WIDGET_TOKEN. The service-role key never leaves the server; the widget only
// ever sees the shaped JSON below.

import { createClient } from "@supabase/supabase-js";
import { PROGRAM, getDay } from "@/lib/program/program";
import {
  buildSession, completedCount, freshProgress, nextSession, suggestNextWeight,
} from "@/lib/program/program-engine";
import { getExercise } from "@/lib/program/exercises";
import type {
  ProgramPrefs, ProgramProgress, RunStep, SessionLog,
} from "@/lib/program/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache; the widget polls fresh

// Justin's /program user id. Not a secret (RLS + the service-role key are the
// real guard); env override lets the same route serve a different user later.
const DEFAULT_USER_ID = "646845f6-0a17-4c18-9b96-d94b6f1f96fc";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // 1) Token gate.
  const expected = process.env.WIDGET_TOKEN;
  if (!expected || url.searchParams.get("token") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  // 2) Service-role client (server-only; bypasses RLS).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server not configured" }, 500);
  }
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = process.env.PROGRAM_USER_ID || DEFAULT_USER_ID;

  // 3) Pull the three pieces of state the engine needs.
  const [progressRes, prefsRes, sessionsRes] = await Promise.all([
    sb.from("program_progress")
      .select("block_number,current_week,completed,block_started_at")
      .eq("user_id", userId).maybeSingle(),
    sb.from("program_prefs")
      .select("subs,preferred,avoided")
      .eq("user_id", userId).maybeSingle(),
    sb.from("program_sessions")
      .select("data")
      .eq("user_id", userId)
      .order("date", { ascending: false }), // newest-first, as the engine expects
  ]);

  if (sessionsRes.error) {
    return json({ error: "query failed", detail: sessionsRes.error.message }, 500);
  }

  const progress: ProgramProgress = progressRes.data
    ? {
        blockNumber: progressRes.data.block_number ?? 1,
        currentWeek: (progressRes.data.current_week ?? 1) as 1 | 2 | 3 | 4,
        completed: progressRes.data.completed ?? [],
        blockStartedAt: progressRes.data.block_started_at ?? new Date().toISOString(),
      }
    : freshProgress();

  const prefs: ProgramPrefs = {
    subs: prefsRes.data?.subs ?? {},
    preferred: prefsRes.data?.preferred ?? [],
    avoided: prefsRes.data?.avoided ?? [],
  };

  const sessions: SessionLog[] = (sessionsRes.data ?? []).map((r) => r.data as SessionLog);
  const updatedAt = sessions[0]?.date ?? new Date().toISOString();

  // 4) What's next in the rotation?
  const next = nextSession(progress);
  const weekTotal = PROGRAM.days.length;        // 4
  const blockTotal = PROGRAM.weeks * weekTotal; // 16
  const blockCompleted = completedCount(progress);

  if (!next) {
    // Whole 4×4 block is done — surface that instead of a stale session.
    return json({
      program: PROGRAM.name,
      block: progress.blockNumber,
      split: "Block complete 🎉",
      week: 4, day: 4,
      todayLifts: [],
      weekCompleted: weekTotal, weekTotal,
      blockCompleted, blockTotal,
      updatedAt,
    });
  }

  // 5) Assemble the upcoming session and shape today's loaded lifts.
  const session = buildSession(next.week, next.day, prefs, progress);
  const loadedMains = session.steps.filter((s) => s.phase === "main" && s.loaded);
  // Fall back to all main steps (e.g. a bodyweight or Day-4 day) so the tile is
  // never empty when there's still work prescribed.
  const liftSteps: RunStep[] = loadedMains.length
    ? loadedMains
    : session.steps.filter((s) => s.phase === "main");

  const todayLifts = liftSteps.map((step) => {
    const name = step.subLabel ?? getExercise(step.exerciseId)?.name ?? step.exerciseId;
    const prog = step.loaded
      ? suggestNextWeight(sessions, step.exerciseId, step.reps ?? null)
      : { lastWeight: null, suggested: null };
    return {
      name,
      scheme: step.display,
      lastWeight: prog.lastWeight,
      targetWeight: prog.suggested,
      unit: "lb",
    };
  });

  const weekCompleted = progress.completed.filter((c) => c.week === next.week).length;

  return json({
    program: PROGRAM.name,
    block: progress.blockNumber,
    split: session.title,
    week: next.week,
    day: next.day,
    todayLifts,
    weekCompleted,
    weekTotal,
    blockCompleted,
    blockTotal,
    updatedAt,
  });
}
