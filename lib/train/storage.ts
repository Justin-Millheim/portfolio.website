import type { ActiveSession, WorkoutSession } from "./types";

// Single interface every backend implements. The UI only ever talks to this,
// so the localStorage (guest) and Supabase (cloud) adapters are interchangeable.
export interface WorkoutStore {
  list(): Promise<WorkoutSession[]>;
  get(id: string): Promise<WorkoutSession | null>;
  save(session: WorkoutSession): Promise<void>;
  remove(id: string): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  // Last weight a user used for a given exercise, to pre-fill the runner.
  lastWeight(exerciseId: string): Promise<number | null>;
  // Exercise preferences (preferred / blocked) that bias future plans.
  getPrefs(): Promise<ExercisePrefs>;
  savePrefs(prefs: ExercisePrefs): Promise<void>;
}

const KEY = "train.sessions.v1";
const ACTIVE_KEY = "train.active.v1";
const PREFS_KEY = "train.prefs.v1";

// Exercise preferences that bias future plan generation.
//   preferred — weighted to appear more often when relevant to the focus.
//   blocked   — never suggested again.
export interface ExercisePrefs {
  preferred: string[];
  blocked: string[];
}

export function loadPrefs(): ExercisePrefs {
  if (typeof window === "undefined") return { preferred: [], blocked: [] };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<ExercisePrefs>) : {};
    return { preferred: p.preferred ?? [], blocked: p.blocked ?? [] };
  } catch {
    return { preferred: [], blocked: [] };
  }
}

function writePrefs(p: ExercisePrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    throw new Error("Couldn't save on this device — storage may be full.");
  }
}

// Pure toggles (no IO) — marking preferred clears any block on it, and vice
// versa. Callers persist the result through the active store so it syncs.
export function applyTogglePreferred(p: ExercisePrefs, id: string): ExercisePrefs {
  return p.preferred.includes(id)
    ? { ...p, preferred: p.preferred.filter((x) => x !== id) }
    : { preferred: [...p.preferred, id], blocked: p.blocked.filter((x) => x !== id) };
}

export function applyToggleBlocked(p: ExercisePrefs, id: string): ExercisePrefs {
  return p.blocked.includes(id)
    ? { ...p, blocked: p.blocked.filter((x) => x !== id) }
    : { blocked: [...p.blocked, id], preferred: p.preferred.filter((x) => x !== id) };
}

function readAll(): WorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkoutSession[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: WorkoutSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    // Surface a clear, catchable error instead of an unhandled rejection that
    // would silently drop the just-finished workout.
    throw new Error("Couldn't save on this device — storage may be full.");
  }
}

// On-device adapter. Zero backend, zero cost. Data lives in this browser.
export class LocalStore implements WorkoutStore {
  async list(): Promise<WorkoutSession[]> {
    return readAll().sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  async get(id: string): Promise<WorkoutSession | null> {
    return readAll().find((s) => s.id === id) ?? null;
  }
  async save(session: WorkoutSession): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.push(session);
    writeAll(all);
  }
  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((s) => s.id !== id));
  }
  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const all = readAll();
    const s = all.find((x) => x.id === id);
    if (s) {
      s.favorite = favorite;
      writeAll(all);
    }
  }
  async lastWeight(exerciseId: string): Promise<number | null> {
    return lastWeightFrom(await this.list(), exerciseId);
  }
  async getPrefs(): Promise<ExercisePrefs> {
    return loadPrefs();
  }
  async savePrefs(prefs: ExercisePrefs): Promise<void> {
    writePrefs(prefs);
  }
}

// Shared helper: newest-first sessions -> most recent logged weight for a move.
export function lastWeightFrom(sessions: WorkoutSession[], exerciseId: string): number | null {
  for (const s of sessions) {
    const log = s.logs.find((l) => l.exerciseId === exerciseId);
    if (log) {
      for (let i = log.sets.length - 1; i >= 0; i--) {
        const w = log.sets[i].weight;
        if (w != null) return w;
      }
    }
  }
  return null;
}

// ---- Basic progressive overload ----------------------------------------
// Look at the most recent session where this loaded exercise was actually done
// and decide what to suggest today. If every completed set met/beat the target
// reps last time, nudge the weight up one step; otherwise repeat the same weight
// so the user can nail their reps first. Returns the suggested starting weight to
// pre-fill plus a short human hint (or nulls when there's no usable history).
export interface ProgressionSuggestion {
  lastWeight: number | null;
  suggested: number | null;
  hint: string | null;
}

export function suggestNextWeight(
  sessions: WorkoutSession[],
  exerciseId: string,
  targetReps: number | null,
): ProgressionSuggestion {
  for (const s of sessions) {
    const log = s.logs.find((l) => l.exerciseId === exerciseId);
    if (!log) continue;
    const done = log.sets.filter((x) => x.completed && x.weight != null);
    if (done.length === 0) continue;
    const lastWeight = done[done.length - 1].weight as number;
    // Earned the bump only if reps were tracked and hit on every completed set.
    const hitTarget =
      targetReps != null && done.every((x) => x.reps != null && (x.reps as number) >= targetReps);
    if (hitTarget) {
      const suggested = lastWeight + 5; // matches the runner's 5 lb weight stepper
      return { lastWeight, suggested, hint: `Last time ${lastWeight} lb · try ${suggested} ↑` };
    }
    return { lastWeight, suggested: lastWeight, hint: `Last time ${lastWeight} lb · match or beat your reps` };
  }
  return { lastWeight: null, suggested: null, hint: null };
}

// Active store. Defaults to on-device; TrainApp swaps in a SupabaseStore after
// a successful sign-in, and back to LocalStore on guest/sign-out.
let _store: WorkoutStore = new LocalStore();
export function getStore(): WorkoutStore {
  return _store;
}
export function setActiveStore(store: WorkoutStore): void {
  _store = store;
}
export function useLocalStore(): void {
  _store = new LocalStore();
}

// Raw on-device reads, used to migrate guest data up to the cloud on first login.
export function readLocalSessions(): WorkoutSession[] {
  return readAll();
}
export function readLocalPrefs(): ExercisePrefs {
  return loadPrefs();
}

// Clear on-device history + prefs after a successful guest→cloud migration so
// they can't be re-uploaded later (which would resurrect deleted cloud rows).
// Leaves the in-progress resume cache alone.
export function clearLocalData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(PREFS_KEY);
  } catch {
    /* non-fatal */
  }
}

// ---- In-progress workout cache (resume where you left off) ----
// Survives reloads, accidental navigation, or the phone locking. Cleared when
// the workout is completed or abandoned.
export function saveActive(active: ActiveSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
  } catch {
    /* ignore quota errors */
  }
}
export function loadActive(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}
export function clearActive(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_KEY);
}

// JSON export/import so on-device history can be backed up or moved between
// devices until cloud sync is live.
export function exportSessions(): string {
  return JSON.stringify(readAll(), null, 2);
}
export function importSessions(json: string): number {
  const incoming = JSON.parse(json) as WorkoutSession[];
  if (!Array.isArray(incoming)) throw new Error("Invalid backup file");
  const all = readAll();
  const byId = new Map(all.map((s) => [s.id, s]));
  for (const s of incoming) byId.set(s.id, s);
  writeAll([...byId.values()]);
  return incoming.length;
}
