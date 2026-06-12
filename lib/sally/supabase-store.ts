// Cloud adapter for /sally. Maps the app's camelCase types onto the snake_case
// tables in supabase/sally_schema.sql. Row-Level Security guarantees a user
// can only ever read/write their own rows — the user_id seam that makes the
// app shareable later without a migration (PRD §12).

import type { SupabaseClient } from "@supabase/supabase-js";
import { anchorsFrom, readLocalBlob, type SallyStore } from "./store";
import type {
  ChatMessage, Draft, DraftSection, Mode, Outline, Phase, Song, SongBundle,
  SongStatus, StyleAnchor, SunoPrompt, WeakLine,
} from "./types";
import { renderLyricSheet } from "./format";

type Row = Record<string, unknown>;

function rowToSong(r: Row): Song {
  return {
    id: r.id as string,
    title: r.title as string,
    mode: (r.mode as Mode | null) ?? null,
    styleReference: (r.style_reference as string | null) ?? null,
    styleBlind: Boolean(r.style_blind),
    styleLocked: Boolean(r.style_locked),
    emotionalCore: (r.emotional_core as string | null) ?? null,
    centralMetaphor: (r.central_metaphor as string | null) ?? null,
    currentPhase: (r.current_phase as Phase) ?? 1,
    status: (r.status as SongStatus) ?? "in_progress",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToOutline(r: Row): Outline {
  return {
    id: r.id as string,
    songId: r.song_id as string,
    version: r.version as number,
    workingTitle: r.working_title as string,
    emotionalCore: r.emotional_core as string,
    emotionalArc: r.emotional_arc as string,
    centralMetaphor: r.central_metaphor as string,
    lateTurn: (r.late_turn as string | null) ?? null,
    structure: (r.structure as Outline["structure"]) ?? [],
    chorusConcept: r.chorus_concept as string,
    reasoning: r.reasoning as string,
    approved: Boolean(r.approved),
    createdAt: r.created_at as string,
  };
}

function rowToDraft(r: Row): Draft {
  return {
    id: r.id as string,
    songId: r.song_id as string,
    version: r.draft_version as number,
    title: r.title as string,
    sections: (r.sections as DraftSection[]) ?? [],
    creativeNotes: (r.creative_notes as string[]) ?? [],
    weakLines: (r.weak_lines as WeakLine[]) ?? [],
    createdAt: r.created_at as string,
  };
}

function rowToSuno(r: Row): SunoPrompt {
  return {
    id: r.id as string,
    songId: r.song_id as string,
    prompt: r.prompt as string,
    charCount: r.char_count as number,
    variations: (r.variations as string[]) ?? [],
    createdAt: r.created_at as string,
  };
}

function rowToMessage(r: Row): ChatMessage {
  return {
    id: r.id as string,
    songId: r.song_id as string,
    phase: r.phase as Phase,
    role: r.role as "sally" | "writer",
    content: r.content as string,
    createdAt: r.created_at as string,
  };
}

export class SupabaseStore implements SallyStore {
  constructor(private sb: SupabaseClient, private userId: string) {}

  async listSongs(): Promise<Song[]> {
    const { data, error } = await this.sb
      .from("songs")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });
    if (error) { console.error("[sally] listSongs", error.message); return []; }
    return (data ?? []).map(rowToSong);
  }

  async getBundle(songId: string): Promise<SongBundle | null> {
    const [songQ, outlinesQ, draftsQ, sunosQ, messagesQ] = await Promise.all([
      this.sb.from("songs").select("*").eq("user_id", this.userId).eq("id", songId).maybeSingle(),
      this.sb.from("outlines").select("*").eq("user_id", this.userId).eq("song_id", songId).order("version"),
      this.sb.from("drafts").select("*").eq("user_id", this.userId).eq("song_id", songId).order("draft_version"),
      this.sb.from("suno_prompts").select("*").eq("user_id", this.userId).eq("song_id", songId).order("created_at"),
      this.sb.from("sally_messages").select("*").eq("user_id", this.userId).eq("song_id", songId).order("created_at"),
    ]);
    if (songQ.error || !songQ.data) {
      if (songQ.error) console.error("[sally] getBundle", songQ.error.message);
      return null;
    }
    const sunos = (sunosQ.data ?? []).map(rowToSuno);
    return {
      song: rowToSong(songQ.data),
      outlines: (outlinesQ.data ?? []).map(rowToOutline),
      drafts: (draftsQ.data ?? []).map(rowToDraft),
      suno: sunos[sunos.length - 1] ?? null,
      messages: (messagesQ.data ?? []).map(rowToMessage),
    };
  }

  async saveSong(song: Song): Promise<void> {
    const { error } = await this.sb.from("songs").upsert({
      id: song.id,
      user_id: this.userId,
      title: song.title,
      mode: song.mode,
      style_reference: song.styleReference,
      style_blind: song.styleBlind,
      style_locked: song.styleLocked,
      emotional_core: song.emotionalCore,
      central_metaphor: song.centralMetaphor,
      current_phase: song.currentPhase,
      status: song.status,
      created_at: song.createdAt,
      updated_at: song.updatedAt,
    });
    if (error) console.error("[sally] saveSong", error.message);
  }

  async removeSong(songId: string): Promise<void> {
    // Child rows cascade via FK.
    const { error } = await this.sb.from("songs").delete().eq("user_id", this.userId).eq("id", songId);
    if (error) console.error("[sally] removeSong", error.message);
  }

  async saveOutline(o: Outline): Promise<void> {
    const { error } = await this.sb.from("outlines").upsert({
      id: o.id,
      song_id: o.songId,
      user_id: this.userId,
      version: o.version,
      working_title: o.workingTitle,
      emotional_core: o.emotionalCore,
      emotional_arc: o.emotionalArc,
      central_metaphor: o.centralMetaphor,
      late_turn: o.lateTurn,
      structure: o.structure,
      chorus_concept: o.chorusConcept,
      reasoning: o.reasoning,
      approved: o.approved,
      created_at: o.createdAt,
    });
    if (error) console.error("[sally] saveOutline", error.message);
  }

  async saveDraft(d: Draft): Promise<void> {
    const { error } = await this.sb.from("drafts").upsert({
      id: d.id,
      song_id: d.songId,
      user_id: this.userId,
      draft_version: d.version,
      title: d.title,
      lyric_sheet: renderLyricSheet(d),
      sections: d.sections,
      creative_notes: d.creativeNotes,
      weak_lines: d.weakLines,
      created_at: d.createdAt,
    });
    if (error) console.error("[sally] saveDraft", error.message);
  }

  async saveSuno(s: SunoPrompt): Promise<void> {
    const { error } = await this.sb.from("suno_prompts").upsert({
      id: s.id,
      song_id: s.songId,
      user_id: this.userId,
      prompt: s.prompt,
      char_count: s.charCount,
      variations: s.variations,
      created_at: s.createdAt,
    });
    if (error) console.error("[sally] saveSuno", error.message);
  }

  async addMessage(m: ChatMessage): Promise<void> {
    const { error } = await this.sb.from("sally_messages").upsert({
      id: m.id,
      song_id: m.songId,
      user_id: this.userId,
      phase: m.phase,
      role: m.role,
      content: m.content,
      created_at: m.createdAt,
    });
    if (error) console.error("[sally] addMessage", error.message);
  }

  async styleAnchors(mode: Mode | null, excludeSongId: string): Promise<StyleAnchor[]> {
    const { data, error } = await this.sb
      .from("songs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "complete")
      .neq("id", excludeSongId)
      .order("updated_at", { ascending: false })
      .limit(6);
    if (error || !data?.length) return [];
    const songs = data.map(rowToSong);
    const ids = songs.map((s) => s.id);
    const { data: draftRows } = await this.sb
      .from("drafts")
      .select("*")
      .eq("user_id", this.userId)
      .in("song_id", ids)
      .order("draft_version");
    const latest = new Map<string, Draft>();
    for (const r of draftRows ?? []) {
      const d = rowToDraft(r);
      latest.set(d.songId, d); // ascending order → last write wins
    }
    return anchorsFrom(songs, (id) => latest.get(id) ?? null, mode, excludeSongId);
  }
}

// One-time lift of on-device (guest) work into the cloud on first sign-in.
// Safe to run repeatedly: everything upserts by id.
export async function migrateGuestDataToCloud(store: SallyStore): Promise<number> {
  const local = readLocalBlob();
  let migrated = 0;
  if (local.songs.length) {
    const existing = await store.listSongs();
    const have = new Set(existing.map((s) => s.id));
    for (const song of local.songs) {
      if (have.has(song.id)) continue;
      await store.saveSong(song);
      for (const o of local.outlines.filter((x) => x.songId === song.id)) await store.saveOutline(o);
      for (const d of local.drafts.filter((x) => x.songId === song.id)) await store.saveDraft(d);
      for (const s of local.sunos.filter((x) => x.songId === song.id)) await store.saveSuno(s);
      for (const m of local.messages.filter((x) => x.songId === song.id)) await store.addMessage(m);
      migrated += 1;
    }
  }
  return migrated;
}
