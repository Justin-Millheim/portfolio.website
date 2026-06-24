import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExercisePrefs, WorkoutStore } from "./storage";
import { clearLocalData, lastWeightFrom, readLocalPrefs, readLocalSessions } from "./storage";
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
      .select("data, favorite")
      .eq("user_id", this.userId)
      .order("date", { ascending: false });
    if (error) { console.error("[train] list", error.message); return []; }
    // The top-level `favorite` column is the source of truth (so toggling it is a
    // single targeted write); overlay it onto the stored session blob.
    return (data ?? []).map((r) => ({ ...(r.data as WorkoutSession), favorite: !!r.favorite }));
  }

  async get(id: string): Promise<WorkoutSession | null> {
    const { data, error } = await this.sb
      .from("workouts")
      .select("data, favorite")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    if (error) { console.error("[train] get", error.message); return null; }
    if (!data?.data) return null;
    return { ...(data.data as WorkoutSession), favorite: !!data.favorite };
  }

  // Writes THROW on failure so the UI can notice and not silently lose a workout.
  async save(session: WorkoutSession): Promise<void> {
    const { error } = await this.sb.from("workouts").upsert({
      id: session.id,
      user_id: this.userId,
      date: session.date,
      favorite: !!session.favorite,
      data: { ...session, userId: this.userId },
    });
    if (error) throw new Error(error.message);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.sb.from("workouts").delete().eq("user_id", this.userId).eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Targeted single-column update — no read-modify-write of the whole row, so it
  // can't clobber concurrent edits or silently no-op.
  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const { error } = await this.sb
      .from("workouts")
      .update({ favorite })
      .eq("user_id", this.userId)
      .eq("id", id);
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
  }
}

// One-time lift of on-device (guest) history + prefs into the cloud on first
// sign-in. The caller only invokes this when the device was actually in guest
// mode. After a fully-successful migration the local copies are cleared, so a
// later sign-in can't re-upload them — which previously resurrected workouts the
// user had deleted from the cloud. If any save throws, we leave the local data
// intact so nothing is lost before it's safely in the cloud.
export async function migrateGuestDataToCloud(store: WorkoutStore): Promise<number> {
  let migrated = 0;
  const localSessions = readLocalSessions();
  const localPrefs = readLocalPrefs();
  const hadLocal =
    localSessions.length > 0 || localPrefs.preferred.length > 0 || localPrefs.blocked.length > 0;

  if (localSessions.length) {
    const existing = await store.list();
    const ids = new Set(existing.map((s) => s.id));
    for (const s of localSessions) {
      if (!ids.has(s.id)) { await store.save(s); migrated += 1; }
    }
  }
  if (localPrefs.preferred.length || localPrefs.blocked.length) {
    const cloud = await store.getPrefs();
    await store.savePrefs({
      preferred: Array.from(new Set([...cloud.preferred, ...localPrefs.preferred])),
      blocked: Array.from(new Set([...cloud.blocked, ...localPrefs.blocked])),
    });
  }
  if (hadLocal) clearLocalData();
  return migrated;
}
