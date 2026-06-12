// Storage seam for /sally. The UI only ever talks to SallyStore, so the
// localStorage (guest) and Supabase (cloud) adapters are interchangeable —
// the same pattern that lets /train and /recipes swap backends without a
// rewrite. Persistence philosophy (PRD §18): nothing is ever lost — outlines
// and drafts are append-only versions.

import type {
  ChatMessage, Draft, Mode, Outline, Song, SongBundle, StyleAnchor, SunoPrompt,
} from "./types";

export interface SallyStore {
  listSongs(): Promise<Song[]>;
  getBundle(songId: string): Promise<SongBundle | null>;
  saveSong(song: Song): Promise<void>;
  removeSong(songId: string): Promise<void>;
  saveOutline(outline: Outline): Promise<void>;
  saveDraft(draft: Draft): Promise<void>;
  saveSuno(suno: SunoPrompt): Promise<void>;
  addMessage(message: ChatMessage): Promise<void>;
  // Living reference corpus (PRD §7): compact anchors from finished songs.
  styleAnchors(mode: Mode | null, excludeSongId: string): Promise<StyleAnchor[]>;
}

const KEY = "sally.studio.v1";

interface LocalBlob {
  songs: Song[];
  outlines: Outline[];
  drafts: Draft[];
  sunos: SunoPrompt[];
  messages: ChatMessage[];
}

const EMPTY: LocalBlob = { songs: [], outlines: [], drafts: [], sunos: [], messages: [] };

function readAll(): LocalBlob {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<LocalBlob>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function writeAll(blob: LocalBlob) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(blob));
}

function upsert<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const next = arr.slice();
    next[idx] = item;
    return next;
  }
  return [...arr, item];
}

export function anchorsFrom(
  songs: Song[],
  latestDraftFor: (songId: string) => Draft | null,
  mode: Mode | null,
  excludeSongId: string,
): StyleAnchor[] {
  const done = songs
    .filter((s) => s.id !== excludeSongId && s.status === "complete")
    .sort((a, b) => {
      const am = a.mode === mode ? 0 : 1;
      const bm = b.mode === mode ? 0 : 1;
      return am !== bm ? am - bm : a.updatedAt < b.updatedAt ? 1 : -1;
    })
    .slice(0, 3); // cap anchors so the corpus flavors, never homogenizes (§17)
  const anchors: StyleAnchor[] = [];
  for (const s of done) {
    const d = latestDraftFor(s.id);
    if (!d) continue;
    const chorus = d.sections.find((x) => x.kind === "chorus" || x.kind === "hook");
    const verse = d.sections.find((x) => x.kind === "verse");
    const sampleLines = [...(chorus?.lines.slice(0, 2) ?? []), ...(verse?.lines.slice(0, 1) ?? [])].filter(Boolean);
    anchors.push({ title: s.title, mode: s.mode, centralMetaphor: s.centralMetaphor, sampleLines });
  }
  return anchors;
}

// On-device adapter. Zero backend; data lives in this browser.
export class LocalStore implements SallyStore {
  async listSongs(): Promise<Song[]> {
    return readAll().songs.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getBundle(songId: string): Promise<SongBundle | null> {
    const all = readAll();
    const song = all.songs.find((s) => s.id === songId);
    if (!song) return null;
    const outlines = all.outlines.filter((o) => o.songId === songId).sort((a, b) => a.version - b.version);
    const drafts = all.drafts.filter((d) => d.songId === songId).sort((a, b) => a.version - b.version);
    const sunos = all.sunos.filter((s) => s.songId === songId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const messages = all.messages.filter((m) => m.songId === songId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return { song, outlines, drafts, suno: sunos[sunos.length - 1] ?? null, messages };
  }

  async saveSong(song: Song): Promise<void> {
    const all = readAll();
    writeAll({ ...all, songs: upsert(all.songs, song) });
  }

  async removeSong(songId: string): Promise<void> {
    const all = readAll();
    writeAll({
      songs: all.songs.filter((s) => s.id !== songId),
      outlines: all.outlines.filter((o) => o.songId !== songId),
      drafts: all.drafts.filter((d) => d.songId !== songId),
      sunos: all.sunos.filter((s) => s.songId !== songId),
      messages: all.messages.filter((m) => m.songId !== songId),
    });
  }

  async saveOutline(outline: Outline): Promise<void> {
    const all = readAll();
    writeAll({ ...all, outlines: upsert(all.outlines, outline) });
  }

  async saveDraft(draft: Draft): Promise<void> {
    const all = readAll();
    writeAll({ ...all, drafts: upsert(all.drafts, draft) });
  }

  async saveSuno(suno: SunoPrompt): Promise<void> {
    const all = readAll();
    writeAll({ ...all, sunos: upsert(all.sunos, suno) });
  }

  async addMessage(message: ChatMessage): Promise<void> {
    const all = readAll();
    writeAll({ ...all, messages: upsert(all.messages, message) });
  }

  async styleAnchors(mode: Mode | null, excludeSongId: string): Promise<StyleAnchor[]> {
    const all = readAll();
    const latestDraftFor = (songId: string): Draft | null => {
      const ds = all.drafts.filter((d) => d.songId === songId).sort((a, b) => b.version - a.version);
      return ds[0] ?? null;
    };
    return anchorsFrom(all.songs, latestDraftFor, mode, excludeSongId);
  }
}

// Active store. Defaults to on-device; SallyApp swaps in a SupabaseStore after
// sign-in, and back to LocalStore on guest/sign-out.
let _store: SallyStore = new LocalStore();
export function getStore(): SallyStore {
  return _store;
}
export function setActiveStore(store: SallyStore): void {
  _store = store;
}
export function useLocalStore(): void {
  _store = new LocalStore();
}

// Raw on-device read, used to migrate guest data up to the cloud on sign-in.
export function readLocalBlob(): LocalBlob {
  return readAll();
}
