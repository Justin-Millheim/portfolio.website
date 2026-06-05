"use client";

import { useMemo, useRef } from "react";
import type { WorkoutSession } from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { exportSessions, importSessions } from "@/lib/train/storage";
import { FOCUS_LABEL, formatClock, sessionVolume } from "@/lib/train/format";

interface Trend {
  exerciseId: string;
  name: string;
  emoji: string;
  points: { date: string; weight: number }[];
}

function buildTrends(sessions: WorkoutSession[]): Trend[] {
  // chronological (oldest -> newest) for left-to-right charts
  const chron = [...sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
  const byEx = new Map<string, { date: string; weight: number }[]>();
  for (const s of chron) {
    for (const log of s.logs) {
      const ex = getExercise(log.exerciseId);
      if (!ex?.loaded) continue;
      const best = log.sets.reduce<number | null>((m, set) => {
        if (set.weight == null) return m;
        return m == null ? set.weight : Math.max(m, set.weight);
      }, null);
      if (best == null) continue;
      const arr = byEx.get(log.exerciseId) ?? [];
      arr.push({ date: s.date, weight: best });
      byEx.set(log.exerciseId, arr);
    }
  }
  const trends: Trend[] = [];
  for (const [id, points] of byEx) {
    if (points.length < 1) continue;
    const ex = getExercise(id)!;
    trends.push({ exerciseId: id, name: ex.name, emoji: ex.emoji, points });
  }
  // most-tracked first
  return trends.sort((a, b) => b.points.length - a.points.length).slice(0, 6);
}

export default function History({
  sessions,
  onBack,
  onDelete,
  onImported,
}: {
  sessions: WorkoutSession[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onImported: () => void;
}) {
  const trends = useMemo(() => buildTrends(sessions), [sessions]);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalWorkouts = sessions.length;
  const streak = computeStreak(sessions);

  function doExport() {
    const blob = new Blob([exportSessions()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `train-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSessions(String(reader.result));
        onImported();
      } catch {
        alert("That doesn't look like a valid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 36 }}>
      <button onClick={onBack} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 12, cursor: "pointer", marginBottom: 8 }}>
        ← Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 16px" }}>
        Your <span style={{ color: "var(--t-flame)" }}>progress</span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        <div className="t-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--t-amber)" }}>{totalWorkouts}</div>
          <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)" }}>WORKOUTS</div>
        </div>
        <div className="t-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--t-amber)" }}>{streak}🔥</div>
          <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)" }}>WEEK STREAK</div>
        </div>
      </div>

      {/* WEIGHT TRENDS */}
      {trends.length > 0 && (
        <>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Strength trends</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {trends.map((t) => (
              <div key={t.exerciseId} className="t-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{t.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
                    {t.points[0].weight} → {t.points[t.points.length - 1].weight} lb
                  </div>
                </div>
                <Spark points={t.points.map((p) => p.weight)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* SESSION LIST */}
      <div className="t-eyebrow" style={{ marginBottom: 10 }}>History</div>
      {sessions.length === 0 && (
        <p style={{ color: "var(--t-muted)", fontSize: 14 }}>No workouts logged yet. Go crush one.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sessions.map((s) => (
          <div key={s.id} className="t-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{FOCUS_LABEL[s.focus]} · {s.durationTarget}m</div>
              <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
                {new Date(s.date).toLocaleDateString()} · {formatClock(s.totalSeconds)}
                {sessionVolume(s) > 0 ? ` · ${sessionVolume(s).toLocaleString()} lb` : ""}
              </div>
            </div>
            <button
              onClick={() => { if (confirm("Delete this workout?")) onDelete(s.id); }}
              aria-label="Delete"
              style={{ background: "#161616", border: "1px solid #2a2a2a", color: "#777", borderRadius: 8, padding: "6px 9px", fontSize: 13, cursor: "pointer" }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* BACKUP */}
      <div style={{ marginTop: 28 }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Backup</div>
        <p style={{ color: "var(--t-faint)", fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
          History is saved on this device. Export a backup to keep it safe or move it to another device.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="t-btn t-btn-ghost" onClick={doExport}>⬇ Export</button>
          <button className="t-btn t-btn-ghost" onClick={() => fileRef.current?.click()}>⬆ Import</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={doImport} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}

// Compute consecutive-week streak (weeks containing >=1 workout, counting back from this week).
function computeStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const weeks = new Set<number>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor((d.getTime() - onejan.getTime()) / (7 * 864e5)) + d.getFullYear() * 53;
    weeks.add(week);
  }
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  let cur = Math.floor((now.getTime() - onejan.getTime()) / (7 * 864e5)) + now.getFullYear() * 53;
  let streak = 0;
  while (weeks.has(cur)) {
    streak++;
    cur--;
  }
  return streak;
}

function Spark({ points }: { points: number[] }) {
  const w = 72, h = 30, pad = 3;
  if (points.length === 1) {
    return (
      <svg width={w} height={h}>
        <circle cx={w / 2} cy={h / 2} r={3} fill="var(--t-flame)" />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h}>
      <path d={d} fill="none" stroke={up ? "var(--t-flame)" : "#888"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill={up ? "var(--t-amber)" : "#888"} />
      ))}
    </svg>
  );
}
