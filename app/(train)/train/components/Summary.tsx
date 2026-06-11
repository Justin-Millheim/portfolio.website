"use client";

import { useState } from "react";
import type { WorkoutSession } from "@/lib/train/types";
import { completedSetCount, formatClock, sessionVolume } from "@/lib/train/format";

export default function Summary({
  session,
  onDone,
  onHistory,
  onToggleFavorite,
}: {
  session: WorkoutSession;
  onDone: () => void;
  onHistory: () => void;
  onToggleFavorite: (favorite: boolean) => void;
}) {
  const [favorite, setFavorite] = useState(!!session.favorite);
  const vol = sessionVolume(session);
  const sets = completedSetCount(session.logs);
  const skipped = session.logs.filter((l) => l.skipped).length;
  const pt = session.phaseTimes;
  const total = Math.max(1, pt.warmup + pt.circuit + pt.cooldown);

  const segments = [
    { label: "Warm up", val: pt.warmup, color: "#ff9f1e" },
    { label: "Workout", val: pt.circuit, color: "#ff5a1e" },
    { label: "Cool down", val: pt.cooldown, color: "#c2410c" },
  ];

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 44, textAlign: "center" }}>
      <div style={{ fontSize: 56 }}>🔥</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 6px" }}>
        Workout <span style={{ color: "var(--t-flame)" }}>complete</span>
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

      {/* PHASE TIME SPLIT */}
      <div className="t-card" style={{ textAlign: "left", marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Time breakdown</div>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
          {segments.map((s) => (
            <div key={s.label} style={{ width: `${(s.val / total) * 100}%`, background: s.color }} />
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
      <button className="t-btn t-btn-quiet" style={{ marginTop: 10 }} onClick={onHistory}>View history →</button>
      <p className="t-mono" style={{ textAlign: "center", color: "var(--t-faint)", fontSize: 11, marginTop: 12 }}>
        Favorites show up first under “Do a previous workout”.
      </p>
    </div>
  );
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
