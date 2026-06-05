"use client";

import { useState } from "react";
import type { WorkoutSession } from "@/lib/train/types";
import { FOCUS_LABEL, formatClock } from "@/lib/train/format";

const FOCUS_EMOJI: Record<string, string> = {
  full: "🔥", legs: "🦵", arms: "💪", core: "🧱", cardio: "🏃",
};

// Modal: favorites first (collapsible), then all prior workouts (collapsible),
// each sorted newest-first with a "Start workout" CTA.
export default function PreviousWorkoutsModal({
  sessions,
  onStart,
  onClose,
}: {
  sessions: WorkoutSession[];
  onStart: (s: WorkoutSession) => void;
  onClose: () => void;
}) {
  const byDateDesc = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const favorites = byDateDesc.filter((s) => s.favorite);
  const [favOpen, setFavOpen] = useState(true);
  const [allOpen, setAllOpen] = useState(favorites.length === 0);

  return (
    <div className="t-modal-scrim" onClick={onClose}>
      <div className="t-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>Do a previous workout</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "#1d1d1d", border: "1px solid #333", color: "var(--t-muted)", borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>

        {sessions.length === 0 && (
          <p style={{ color: "var(--t-muted)", fontSize: 14 }}>
            No saved workouts yet. Finish one and tap “Save as favorite” to pin it here.
          </p>
        )}

        {/* Favorites drawer */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button className="t-drawer-head" onClick={() => setFavOpen((o) => !o)} aria-expanded={favOpen}>
              <span>★ Favorites</span>
              <span className="t-drawer-count">{favorites.length}</span>
              <span style={{ transform: favOpen ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
            </button>
            {favOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {favorites.map((s) => <Row key={s.id} s={s} onStart={onStart} />)}
              </div>
            )}
          </div>
        )}

        {/* All previous drawer */}
        {byDateDesc.length > 0 && (
          <div>
            <button className="t-drawer-head" onClick={() => setAllOpen((o) => !o)} aria-expanded={allOpen}>
              <span>All previous</span>
              <span className="t-drawer-count">{byDateDesc.length}</span>
              <span style={{ transform: allOpen ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
            </button>
            {allOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {byDateDesc.map((s) => <Row key={s.id} s={s} onStart={onStart} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ s, onStart }: { s: WorkoutSession; onStart: (s: WorkoutSession) => void }) {
  return (
    <div className="t-row">
      <span style={{ fontSize: 20 }}>{FOCUS_EMOJI[s.focus]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {s.favorite ? "★ " : ""}{FOCUS_LABEL[s.focus]} · {s.durationTarget}m
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
          {new Date(s.date).toLocaleDateString()} · {formatClock(s.totalSeconds)}
        </div>
      </div>
      <button
        onClick={() => onStart(s)}
        className="t-mono"
        style={{
          background: "linear-gradient(135deg,var(--t-flame),var(--t-amber))", border: "none",
          color: "#fff", borderRadius: 9, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        Start →
      </button>
    </div>
  );
}
