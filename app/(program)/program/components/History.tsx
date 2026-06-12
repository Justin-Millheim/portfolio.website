"use client";

import type { SessionLog } from "@/lib/program/types";
import { getDay } from "@/lib/program/program";
import { formatClock, sessionVolume } from "@/lib/program/format";

export default function History({
  sessions,
  onBack,
  onDelete,
}: {
  sessions: SessionLog[];
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const totalSessions = sessions.length;
  const totalTime = sessions.reduce((n, s) => n + s.totalSeconds, 0);

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 36 }}>
      <button onClick={onBack} className="p-nav-btn">
        ← Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 16px" }}>
        Session <span style={{ color: "var(--t-flame)" }}>history</span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        <div className="t-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--t-amber)" }}>{totalSessions}</div>
          <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)" }}>SESSIONS</div>
        </div>
        <div className="t-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--t-amber)" }}>{formatClock(totalTime)}</div>
          <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)" }}>TOTAL TIME</div>
        </div>
      </div>

      {sessions.length === 0 && (
        <p style={{ color: "var(--t-muted)", fontSize: 14 }}>No sessions logged yet. Go crush one.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sessions.map((s) => {
          const day = getDay(s.day);
          const vol = sessionVolume(s);
          return (
            <div key={s.id} className="t-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {s.favorite ? "⭐ " : ""}B{s.block} · W{s.week} D{s.day} · {day?.title}
                </div>
                <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
                  {new Date(s.date).toLocaleDateString()} · {formatClock(s.totalSeconds)}
                  {vol > 0 ? ` · ${vol.toLocaleString()} lb` : ""}
                  {s.status === "abandoned" ? " · partial" : ""}
                </div>
              </div>
              <button
                onClick={() => onDelete(s.id)}
                aria-label="Delete"
                style={{ background: "#161616", border: "1px solid #2a2a2a", color: "#777", borderRadius: 8, padding: "6px 9px", fontSize: 13, cursor: "pointer" }}
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
