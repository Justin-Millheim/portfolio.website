import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramStore } from "./storage";
import { readLocalPrefs, readLocalProgress, readLocalSessions } from "./storage";
import { freshProgress } from "./program-engine";
import type { ProgramPrefs, ProgramProgress, SessionLog } from "./types";

// Cloud adapter for /program. Sessions live in `program_sessions` (full
// SessionLog in a jsonb `data` column + queryable block/week/day/date/favorite);
// the rotation pointer in a single-row `program_progress`; substitution + pref
// choices in `program_prefs`. Row-Level Security (supabase/program_schema.sql)
// guarantees a user only ever reads/writes their own rows.
export class SupabaseStore implements ProgramStore {
  constructor(private sb: SupabaseClient, private userId: string) {}

  async listSessions(): Promise<SessionLog[]> {
    const { data, error } = await this.sb
      .from("program_sessions")
      .select("data")
      .eq("user_id", this.userId)
      .order("date", { ascending: false });
    if (error) { console.error("[program] listSessions", error.message); return []; }
    return (data ?? []).map((r) => r.data as SessionLog);
  }

  async getSession(id: string): Promise<SessionLog | null> {
    const { data, error } = await this.sb
      .from("program_sessions")
      .select("data")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    if (error) { console.error("[program] getSession", error.message); return null; }
    return (data?.data as SessionLog) ?? null;
  }

  async saveSession(session: SessionLog): Promise<void> {
    const { error } = await this.sb.from("program_sessions").upsert({
      id: session.id,
      user_id: this.userId,
      block: session.block,
      week: session.week,
      day: session.day,
      date: session.date,
      favorite: !!session.favorite,
      data: { ...session, userId: this.userId },
    });
    if (error) console.error("[program] saveSession", error.message);
  }

  async removeSession(id: string): Promise<void> {
    const { error } = await this.sb.from("program_sessions").delete().eq("user_id", this.userId).eq("id", id);
    if (error) console.error("[program] removeSession", error.message);
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const s = await this.getSession(id);
    if (!s) return;
    await this.saveSession({ ...s, favorite });
  }

  async getProgress(): Promise<ProgramProgress> {
    const { data, error } = await this.sb
      .from("program_progress")
      .select("block_number,current_week,completed,block_started_at")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) { console.error("[program] getProgress", error.message); return freshProgress(); }
    if (!data) return freshProgress();
    return {
      blockNumber: data.block_number ?? 1,
      currentWeek: (data.current_week ?? 1) as 1 | 2 | 3 | 4,
      completed: data.completed ?? [],
      blockStartedAt: data.block_started_at ?? new Date().toISOString(),
    };
  }

  async saveProgress(progress: ProgramProgress): Promise<void> {
    const { error } = await this.sb.from("program_progress").upsert({
      user_id: this.userId,
      block_number: progress.blockNumber,
      current_week: progress.currentWeek,
      completed: progress.completed,
      block_started_at: progress.blockStartedAt,
    });
    if (error) console.error("[program] saveProgress", error.message);
  }

  async getPrefs(): Promise<ProgramPrefs> {
    const { data, error } = await this.sb
      .from("program_prefs")
      .select("subs,preferred,avoided")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) { console.error("[program] getPrefs", error.message); return { subs: {}, preferred: [], avoided: [] }; }
    return { subs: data?.subs ?? {}, preferred: data?.preferred ?? [], avoided: data?.avoided ?? [] };
  }

  async savePrefs(prefs: ProgramPrefs): Promise<void> {
    const { error } = await this.sb.from("program_prefs").upsert({
      user_id: this.userId,
      subs: prefs.subs,
      preferred: prefs.preferred,
      avoided: prefs.avoided,
    });
    if (error) console.error("[program] savePrefs", error.message);
  }
}

// One-time lift of on-device (guest) history + prefs + progress into the cloud
// on first sign-in. Safe to run repeatedly: sessions upsert by id; prefs/progress
// merge with cloud taking precedence where it already has data.
export async function migrateGuestDataToCloud(store: ProgramStore): Promise<number> {
  let migrated = 0;
  const localSessions = readLocalSessions();
  if (localSessions.length) {
    const existing = await store.listSessions();
    const ids = new Set(existing.map((s) => s.id));
    for (const s of localSessions) {
      if (!ids.has(s.id)) { await store.saveSession(s); migrated += 1; }
    }
  }

  const localPrefs = readLocalPrefs();
  if (Object.keys(localPrefs.subs).length || localPrefs.preferred.length || localPrefs.avoided.length) {
    const cloud = await store.getPrefs();
    await store.savePrefs({
      subs: { ...localPrefs.subs, ...cloud.subs },
      preferred: Array.from(new Set([...cloud.preferred, ...localPrefs.preferred])),
      avoided: Array.from(new Set([...cloud.avoided, ...localPrefs.avoided])),
    });
  }

  // Progress: only seed the cloud from local if the cloud has none yet (a brand
  // new account). Otherwise the cloud pointer wins.
  const localProgress = readLocalProgress();
  if (localProgress) {
    const cloud = await store.getProgress();
    const cloudEmpty = cloud.completed.length === 0 && cloud.blockNumber === 1 && cloud.currentWeek === 1;
    if (cloudEmpty && (localProgress.completed.length > 0 || localProgress.blockNumber > 1)) {
      await store.saveProgress(localProgress);
    }
  }

  return migrated;
}
