import type { ActiveSession, WorkoutSession } from "./types";

// Single interface every backend implements. The UI only ever talks to this,
// so swapping localStorage -> Supabase later is an isolated change.
export interface WorkoutStore {
  list(): Promise<WorkoutSession[]>;
  get(id: string): Promise<WorkoutSession | null>;
  save(session: WorkoutSession): Promise<void>;
  remove(id: string): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  // Last weight a user used for a given exercise, to pre-fill the runner.
  lastWeight(exerciseId: string): Promise<number | null>;
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

function savePrefs(p: ExercisePrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// Marking an exercise preferred clears any block on it, and vice versa.
export function togglePreferred(id: string): ExercisePrefs {
  const p = loadPrefs();
  if (p.preferred.includes(id)) {
    p.preferred = p.preferred.filter((x) => x !== id);
  } else {
    p.preferred.push(id);
    p.blocked = p.blocked.filter((x) => x !== id);
  }
  savePrefs(p);
  return p;
}

export function toggleBlocked(id: string): ExercisePrefs {
  const p = loadPrefs();
  if (p.blocked.includes(id)) {
    p.blocked = p.blocked.filter((x) => x !== id);
  } else {
    p.blocked.push(id);
    p.preferred = p.preferred.filter((x) => x !== id);
  }
  savePrefs(p);
  return p;
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
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
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
    const sessions = await this.list(); // newest first
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
}

// Factory. When Supabase is wired (env keys present + user signed in), return a
// SupabaseStore here instead; everything upstream is unchanged. See
// supabase/schema.sql and lib/train/supabase-adapter.md for the migration path.
let _store: WorkoutStore | null = null;
export function getStore(): WorkoutStore {
  if (!_store) _store = new LocalStore();
  return _store;
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
