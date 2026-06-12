"use client";

import { useState } from "react";
import type { ConditioningOption } from "@/lib/program/types";
import { getDay } from "@/lib/program/program";

// Day 4 is a conditioning menu (no per-week progression). Opt 4 (bodyweight
// circuit) runs through the full Runner; Opt 1–3 (swim / bike / treadmill) use
// this one-screen logger — duration + note + done — and still count toward block
// completion (consistency over perfection).
export default function Day4Menu({
  week,
  onStartCircuit,
  onLogFree,
  onBack,
}: {
  week: number;
  onStartCircuit: (optionId: string) => void;
  onLogFree: (optionId: string, durationSec: number, note?: string) => void;
  onBack: () => void;
}) {
  const day = getDay(4);
  const options = day?.options ?? [];
  const [logging, setLogging] = useState<ConditioningOption | null>(null);

  if (logging) {
    return <FreeLogger option={logging} onCancel={() => setLogging(null)} onDone={onLogFree} />;
  }

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 40 }}>
      <button onClick={onBack} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 8 }}>
        ← Back
      </button>
      <div className="t-eyebrow" style={{ marginBottom: 4 }}>Week {week} · Day 4</div>
      <h1 style={{ fontSize: 25, fontWeight: 700, margin: "0 0 4px" }}>Conditioning — your choice</h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, margin: "0 0 22px" }}>
        Pick one. Any choice counts toward finishing the week.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => (opt.kind === "circuit" ? onStartCircuit(opt.id) : setLogging(opt))}
            className="t-card"
            style={{ textAlign: "left", cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }}
          >
            <span style={{ fontSize: 30 }}>{opt.emoji}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{opt.label}</span>
              <span className="t-mono" style={{ display: "block", fontSize: 11.5, color: "var(--t-muted)", marginTop: 3, lineHeight: 1.5 }}>
                {opt.note}
              </span>
            </span>
            <span style={{ color: "var(--t-amber)", fontSize: 18 }}>
              {opt.kind === "circuit" ? "▶" : "›"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FreeLogger({
  option,
  onCancel,
  onDone,
}: {
  option: ConditioningOption;
  onCancel: () => void;
  onDone: (optionId: string, durationSec: number, note?: string) => void;
}) {
  const [minutes, setMinutes] = useState<number>(option.durationSec ? Math.round(option.durationSec / 60) : 30);
  const [note, setNote] = useState("");

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 48 }}>
      <div style={{ fontSize: 48, textAlign: "center" }}>{option.emoji}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: "center", margin: "10px 0 4px" }}>{option.label}</h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, textAlign: "center", margin: "0 0 26px" }}>
        {option.note}
      </p>

      <div className="t-card" style={{ marginBottom: 14 }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>How long?</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="t-btn t-btn-ghost" style={{ width: 56 }} onClick={() => setMinutes((m) => Math.max(5, m - 5))}>−</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{minutes}</span>
            <span className="t-mono" style={{ fontSize: 12, color: "var(--t-muted)" }}> min</span>
          </div>
          <button className="t-btn t-btn-ghost" style={{ width: 56 }} onClick={() => setMinutes((m) => m + 5)}>＋</button>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Notes (optional)</div>
        <textarea rows={3} placeholder="Felt good, mixed sprints and easy laps…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <button className="t-btn t-btn-primary" onClick={() => onDone(option.id, minutes * 60, note.trim() || undefined)}>
        ✓ Log it &amp; finish day →
      </button>
      <button className="t-btn t-btn-quiet" style={{ marginTop: 10 }} onClick={onCancel}>← Back to choices</button>
    </div>
  );
}
