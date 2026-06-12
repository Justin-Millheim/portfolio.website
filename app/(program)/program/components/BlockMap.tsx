"use client";

import type { ProgramProgress } from "@/lib/program/types";
import { isDayComplete, nextSession } from "@/lib/program/program-engine";
import { PROGRAM } from "@/lib/program/program";

// The Block Map: a 4×4 grid (weeks × days). Each cell shows complete / current /
// upcoming; tap any cell to preview or start that Day × Week. An override still
// logs against its true Week/Day, so the rotation pointer is unaffected.
export default function BlockMap({
  progress,
  onPick,
  onBack,
}: {
  progress: ProgramProgress;
  onPick: (week: 1 | 2 | 3 | 4, day: 1 | 2 | 3 | 4) => void;
  onBack: () => void;
}) {
  const up = nextSession(progress);
  const weeks: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const days = PROGRAM.days;

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 40 }}>
      <button onClick={onBack} className="p-nav-btn">
        ← Home
      </button>
      <h1 style={{ fontSize: 25, fontWeight: 700, margin: "0 0 4px" }}>The Block</h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, margin: "0 0 22px" }}>
        Block {progress.blockNumber} · 4 weeks × 4 days. Tap any session to preview it.
      </p>

      <div className="p-grid" style={{ marginBottom: 18 }}>
        <div className="p-grid-label" />
        {days.map((d) => (
          <div key={`h${d.id}`} className="p-grid-label">D{d.id}</div>
        ))}

        {weeks.map((w) => (
          <Row key={w} week={w}>
            {days.map((d) => {
              const done = isDayComplete(progress, w, d.id);
              const current = !done && up?.week === w && up?.day === d.id;
              const cls = `p-cell${done ? " done" : ""}${current ? " current" : ""}`;
              return (
                <button
                  key={`${w}-${d.id}`}
                  className={cls}
                  onClick={() => onPick(w, d.id as 1 | 2 | 3 | 4)}
                  aria-label={`Week ${w} Day ${d.id}: ${d.title}${done ? " (complete)" : current ? " (up next)" : ""}`}
                >
                  <span className="p-cell-emoji">{done ? "✅" : current ? "▶️" : d.id === 4 ? "🤸" : "💪"}</span>
                  <span>{done ? "Done" : current ? "Next" : `W${w}`}</span>
                </button>
              );
            })}
          </Row>
        ))}
      </div>

      <div className="t-mono" style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 10, color: "var(--t-faint)" }}>
        <span>✅ done</span>
        <span>▶️ up next</span>
        <span>💪 upcoming</span>
      </div>
    </div>
  );
}

// A grid row prefixed by its week label (the label spans the leftmost column).
function Row({ week, children }: { week: number; children: React.ReactNode }) {
  return (
    <>
      <div className="p-grid-label">W{week}</div>
      {children}
    </>
  );
}
