"use client";

import { useMemo, useState } from "react";
import type { SessionLog } from "@/lib/program/types";
import { getExercise } from "@/lib/program/exercises";
import { completedSetCount, formatClock, sessionVolume } from "@/lib/program/format";

interface Beat { name: string; from: number; to: number }

export default function Summary({
  session,
  sessions,
  onDone,
  onHistory,
  onProgress,
  onToggleFavorite,
}: {
  session: SessionLog;
  sessions: SessionLog[];          // all sessions (incl. this one) — for "beat last block"
  onDone: () => void;
  onHistory: () => void;
  onProgress: () => void;
  onToggleFavorite: (favorite: boolean) => void;
}) {
  const [favorite, setFavorite] = useState(!!session.favorite);
  const vol = sessionVolume(session);
  const sets = completedSetCount(session.exercises);
  const skipped = session.exercises.filter((l) => l.skipped).length;
  const pt = session.phaseTimes;
  const phaseTotal = pt.warmup + pt.main + pt.cooldown;

  const segments = [
    { label: "Warm up", val: pt.warmup, color: "#ff9f1e" },
    { label: "Main", val: pt.main, color: "#ff5a1e" },
    { label: "Cool down", val: pt.cooldown, color: "#c2410c" },
  ];

  const beats = useMemo(() => computeBeats(session, sessions), [session, sessions]);

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 44, textAlign: "center" }}>
      <div style={{ fontSize: 56 }}>🔥</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 6px" }}>
        Week {session.week}, Day {session.day} <span style={{ color: "var(--t-flame)" }}>done</span>
      </h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, margin: "0 0 24px" }}>
        {formatClock(session.totalSeconds)} of work. 💪
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: skipped > 0 ? 10 : 20 }}>
        <StatCard val={formatClock(session.totalSeconds)} label="Time" />
        <StatCard val={String(sets)} label="Sets" />
        <StatCard val={vol > 0 ? `${vol.toLocaleString()}` : "—"} label="Volume (lb)" />
      </div>
      {skipped > 0 && (
        <p className="t-mono" style={{ fontSize: 12, color: "var(--t-faint)", margin: "0 0 20px" }}>
          ⏭ {skipped} exercise{skipped === 1 ? "" : "s"} skipped
        </p>
      )}

      {/* WHAT YOU BEAT vs LAST BLOCK */}
      {beats.length > 0 && (
        <div className="t-card" style={{ textAlign: "left", marginBottom: 16, borderColor: "var(--t-flame)" }}>
          <div className="t-eyebrow" style={{ color: "var(--t-flame)", marginBottom: 10 }}>🏆 New ground</div>
          {beats.map((b) => (
            <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <span style={{ fontSize: 13, color: "#bdb6ab", flex: 1 }}>{b.name}</span>
              <span className="t-mono" style={{ fontSize: 13, color: "var(--t-amber)" }}>
                {b.from} → {b.to} lb
              </span>
            </div>
          ))}
        </div>
      )}

      {/* PHASE TIME SPLIT */}
      {phaseTotal > 0 && (
        <div className="t-card" style={{ textAlign: "left", marginBottom: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>Time breakdown</div>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            {segments.map((s) => (
              <div key={s.label} style={{ width: `${(s.val / phaseTotal) * 100}%`, background: s.color }} />
            ))}
          </div>
          {segments.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
              <span style={{ fontSize: 13, color: "#bdb6ab" }}>{s.label}</span>
              <span className="t-mono" style={{ marginLeft: "auto", fontSize: 13, color: "var(--t-ink)" }}>
                {formatClock(s.val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ENERGY DELTA */}
      {session.pre && session.post && (
        <div className="t-card" style={{ textAlign: "left", marginBottom: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 12 }}>How you felt</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            <FeelBlock label="Before" mood={session.pre.mood} energy={session.pre.energy} />
            <span style={{ color: "var(--t-faint)", fontSize: 20 }}>→</span>
            <FeelBlock label="After" mood={session.post.mood} energy={session.post.energy} />
          </div>
          {session.post.note && (
            <p style={{ fontSize: 13, color: "#9a9289", marginTop: 14, fontStyle: "italic", lineHeight: 1.5 }}>
              “{session.post.note}”
            </p>
          )}
        </div>
      )}

      <button
        className={`t-fav${favorite ? " on" : ""}`}
        style={{ marginBottom: 12 }}
        aria-pressed={favorite}
        onClick={() => { const next = !favorite; setFavorite(next); onToggleFavorite(next); }}
      >
        {favorite ? "⭐ Saved as favorite" : "⭐ Save as favorite"}
      </button>

      <button className="t-btn t-btn-primary" onClick={onDone}>Done</button>
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button className="t-btn t-btn-quiet" onClick={onProgress}>📈 Progress</button>
        <button className="t-btn t-btn-quiet" onClick={onHistory}>📓 History</button>
      </div>
    </div>
  );
}

// For each loaded lift in this session, find the most recent PRIOR session with
// the same lift and a logged weight; surface any that set a new high.
function computeBeats(session: SessionLog, all: SessionLog[]): Beat[] {
  const prior = all
    .filter((s) => s.id !== session.id && s.date < session.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest-first
  const out: Beat[] = [];
  for (const log of session.exercises) {
    const ex = getExercise(log.exerciseId);
    if (!ex?.loaded) continue;
    const now = topWeight(log.sets);
    if (now == null) continue;
    let before: number | null = null;
    for (const s of prior) {
      const pl = s.exercises.find((l) => l.exerciseId === log.exerciseId);
      const w = pl ? topWeight(pl.sets) : null;
      if (w != null) { before = w; break; }
    }
    if (before != null && now > before) {
      out.push({ name: ex.name, from: before, to: now });
    }
  }
  return out;
}

function topWeight(sets: SessionLog["exercises"][number]["sets"]): number | null {
  return sets.reduce<number | null>((m, set) => {
    if (!set.done || set.weight == null) return m;
    return m == null ? set.weight : Math.max(m, set.weight);
  }, null);
}

function StatCard({ val, label }: { val: string; label: string }) {
  return (
    <div className="t-card" style={{ padding: "16px 8px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--t-amber)" }}>{val}</div>
      <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)", letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FeelBlock({ label, mood, energy }: { label: string; mood: string; energy: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 30 }}>{mood}</div>
      <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)", marginTop: 4 }}>{label} · ⚡{energy}/5</div>
    </div>
  );
}
