import type { ActiveSession, ProgramPrefs, ProgramProgress, SessionLog } from "./types";
import { freshProgress } from "./program-engine";

// Single interface every backend implements. The UI only ever talks to this, so
// the localStorage (guest) and Supabase (cloud) adapters are interchangeable —
// the same lift-and-share pattern as /train.
export interface ProgramStore {
  listSessions(): Promise<SessionLog[]>;
  getSession(id: string): Promise<SessionLog | null>;
  saveSession(session: SessionLog): Promise<void>;
  removeSession(id: string): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  getProgress(): Promise<ProgramProgress>;
  saveProgress(progress: ProgramProgress): Promise<void>;
  getPrefs(): Promise<ProgramPrefs>;
  savePrefs(prefs: ProgramPrefs): Promise<void>;
}

const SESSIONS_KEY = "program.sessions.v1";
const ACTIVE_KEY = "program.active.v1";
const PREFS_KEY = "program.prefs.v1";
const PROGRESS_KEY = "program.progress.v1";

export const EMPTY_PREFS: ProgramPrefs = { subs: {}, preferred: [], avoided: [] };

// ---- prefs -----------------------------------------------------------------
export function loadPrefs(): ProgramPrefs {
  if (typeof window === "undefined") return { ...EMPTY_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<ProgramPrefs>) : {};
    return { subs: p.subs ?? {}, preferred: p.preferred ?? [], avoided: p.avoided ?? [] };
  } catch {
    return { ...EMPTY_PREFS };
  }
}
function writePrefs(p: ProgramPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// ---- progress --------------------------------------------------------------
export function loadProgress(): ProgramProgress {
  if (typeof window === "undefined") return freshProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgramProgress) : freshProgress();
  } catch {
    return freshProgress();
  }
}
function writeProgress(p: ProgramProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

// ---- sessions --------------------------------------------------------------
function readAll(): SessionLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SessionLog[]) : [];
  } catch {
    return [];
  }
}
function writeAll(sessions: SessionLog[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

// On-device adapter. Zero backend, zero cost, fully offline.
export class LocalStore implements ProgramStore {
  async listSessions(): Promise<SessionLog[]> {
    return readAll().sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  async getSession(id: string): Promise<SessionLog | null> {
    return readAll().find((s) => s.id === id) ?? null;
  }
  async saveSession(session: SessionLog): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.push(session);
    writeAll(all);
  }
  async removeSession(id: string): Promise<void> {
    writeAll(readAll().filter((s) => s.id !== id));
  }
  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const all = readAll();
    const s = all.find((x) => x.id === id);
    if (s) { s.favorite = favorite; writeAll(all); }
  }
  async getProgress(): Promise<ProgramProgress> {
    return loadProgress();
  }
  async saveProgress(progress: ProgramProgress): Promise<void> {
    writeProgress(progress);
  }
  async getPrefs(): Promise<ProgramPrefs> {
    return loadPrefs();
  }
  async savePrefs(prefs: ProgramPrefs): Promise<void> {
    writePrefs(prefs);
  }
}

// Active store. Defaults to on-device; ProgramApp swaps in a SupabaseStore after
// a successful sign-in, and back to LocalStore on guest/sign-out.
let _store: ProgramStore = new LocalStore();
export function getStore(): ProgramStore {
  return _store;
}
export function setActiveStore(store: ProgramStore): void {
  _store = store;
}
export function useLocalStore(): void {
  _store = new LocalStore();
}

// Raw on-device reads, used to migrate guest data up to the cloud on first login.
export function readLocalSessions(): SessionLog[] {
  return readAll();
}
export function readLocalPrefs(): ProgramPrefs {
  return loadPrefs();
}
export function readLocalProgress(): ProgramProgress | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PROGRESS_KEY) ? loadProgress() : null;
}

// ---- in-progress session cache (resume where you left off) -----------------
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
