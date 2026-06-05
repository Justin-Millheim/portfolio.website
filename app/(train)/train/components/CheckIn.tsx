"use client";

import { useState } from "react";
import type { CheckIn as CheckInType } from "@/lib/train/types";
import { MOODS, MOOD_LABEL } from "@/lib/train/format";

// Shared pre/post "how are you feeling" capture.
export default function CheckIn({
  variant,
  onSubmit,
}: {
  variant: "pre" | "post";
  onSubmit: (c: CheckInType) => void;
}) {
  const [energy, setEnergy] = useState<number>(3);
  const [moodIdx, setMoodIdx] = useState<number>(3);
  const [note, setNote] = useState("");

  const pre = variant === "pre";

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 48 }}>
      <div style={{ fontSize: 44, textAlign: "center" }}>{pre ? "👋" : "🎉"}</div>
      <h1 style={{ fontSize: 25, fontWeight: 700, textAlign: "center", margin: "10px 0 4px" }}>
        {pre ? "Before we start" : "How'd that feel?"}
      </h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, textAlign: "center", margin: "0 0 28px" }}>
        {pre ? "A quick check-in so you can track how you feel over time." : "Log it so future-you can see the trend."}
      </p>

      <div className="t-card" style={{ marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>{pre ? "Energy right now" : "Energy after"}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setEnergy(n)}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 10, cursor: "pointer",
                fontSize: 16, fontWeight: 700,
                background: energy >= n ? "linear-gradient(135deg,var(--t-flame),var(--t-amber))" : "#161616",
                border: `1px solid ${energy >= n ? "var(--t-flame)" : "#222"}`,
                color: energy >= n ? "#fff" : "#666",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="t-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--t-faint)", marginTop: 6 }}>
          <span>Drained</span><span>Energized</span>
        </div>
      </div>

      <div className="t-card" style={{ marginBottom: 24 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Mood</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
          {MOODS.map((m, i) => (
            <button
              key={i}
              onClick={() => setMoodIdx(i)}
              title={MOOD_LABEL[i]}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontSize: 24,
                background: moodIdx === i ? "rgba(255,90,30,0.15)" : "#161616",
                border: `1px solid ${moodIdx === i ? "var(--t-flame)" : "#222"}`,
                filter: moodIdx === i ? "none" : "grayscale(0.5) opacity(0.7)",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {!pre && (
        <div style={{ marginBottom: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Notes (optional)</div>
          <textarea
            rows={3}
            placeholder="Felt strong on squats, shoulders a bit tight…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      <button
        className="t-btn t-btn-primary"
        onClick={() => onSubmit({ energy, mood: MOODS[moodIdx], note: note.trim() || undefined })}
      >
        {pre ? "Let's go →" : "See summary →"}
      </button>
    </div>
  );
}
