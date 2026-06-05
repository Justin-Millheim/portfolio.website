import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExercisePrefs, WorkoutStore } from "./storage";
import { lastWeightFrom, readLocalPrefs, readLocalSessions } from "./storage";
import type { WorkoutSession } from "./types";

// Cloud adapter. Stores each session as a row in `workouts` (full session in a
// jsonb `data` column, plus queryable date/favorite), and preferences in a
// per-user `prefs` row. Row-Level Security (see supabase/schema.sql) guarantees
// a user can only ever read/write their own rows.
export class SupabaseStore implements WorkoutStore {
  constructor(private sb: SupabaseClient, private userId: string) {}

  async list(): Promise<WorkoutSession[]> {
    const { data, error } = await this.sb
      .from("workouts")
      .select("data")
      .eq("user_id", this.userId)
      .order("date", { ascending: false });
    if (error) { console.error("[train] list", error.message); return []; }
    return (data ?? []).map((r) => r.data as WorkoutSession);
  }

  async get(id: string): Promise<WorkoutSession | null> {
    const { data, error } = await this.sb
      .from("workouts")
      .select("data")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    if (error) { console.error("[train] get", error.message); return null; }
    return (data?.data as WorkoutSession) ?? null;
  }

  async save(session: WorkoutSession): Promise<void> {
    const { error } = await this.sb.from("workouts").upsert({
      id: session.id,
      user_id: this.userId,
      date: session.date,
      favorite: !!session.favorite,
      data: { ...session, userId: this.userId },
    });
    if (error) console.error("[train] save", error.message);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.sb.from("workouts").delete().eq("user_id", this.userId).eq("id", id);
    if (error) console.error("[train] remove", error.message);
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const s = await this.get(id);
    if (!s) return;
    await this.save({ ...s, favorite });
  }

  async lastWeight(exerciseId: string): Promise<number | null> {
    return lastWeightFrom(await this.list(), exerciseId);
  }

  async getPrefs(): Promise<ExercisePrefs> {
    const { data, error } = await this.sb
      .from("prefs")
      .select("preferred,blocked")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) { console.error("[train] getPrefs", error.message); return { preferred: [], blocked: [] }; }
    return { preferred: data?.preferred ?? [], blocked: data?.blocked ?? [] };
  }

  async savePrefs(prefs: ExercisePrefs): Promise<void> {
    const { error } = await this.sb.from("prefs").upsert({
      user_id: this.userId,
      preferred: prefs.preferred,
      blocked: prefs.blocked,
    });
    if (error) console.error("[train] savePrefs", error.message);
  }
}

// One-time lift of on-device (guest) history + prefs into the cloud on first
// sign-in. Safe to run repeatedly: sessions upsert by id; prefs are merged.
export async function migrateGuestDataToCloud(store: WorkoutStore): Promise<number> {
  let migrated = 0;
  const localSessions = readLocalSessions();
  if (localSessions.length) {
    const existing = await store.list();
    const ids = new Set(existing.map((s) => s.id));
    for (const s of localSessions) {
      if (!ids.has(s.id)) { await store.save(s); migrated += 1; }
    }
  }
  const localPrefs = readLocalPrefs();
  if (localPrefs.preferred.length || localPrefs.blocked.length) {
    const cloud = await store.getPrefs();
    await store.savePrefs({
      preferred: Array.from(new Set([...cloud.preferred, ...localPrefs.preferred])),
      blocked: Array.from(new Set([...cloud.blocked, ...localPrefs.blocked])),
    });
  }
  return migrated;
}
