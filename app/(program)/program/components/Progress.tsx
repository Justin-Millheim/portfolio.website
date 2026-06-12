"use client";

import { useMemo, useState } from "react";
import type { LiftHistory, SessionLog } from "@/lib/program/types";
import { buildLiftHistories } from "@/lib/program/program-engine";
import { getExercise } from "@/lib/program/exercises";

type Metric = "weight" | "volume";

// The headline view: per-lift working-weight and volume across weeks within a
// block and across blocks, with PRs surfaced. Bars read left→right in time.
export default function Progress({
  sessions,
  onBack,
}: {
  sessions: SessionLog[];
  onBack: () => void;
}) {
  const [metric, setMetric] = useState<Metric>("weight");
  const histories = useMemo(() => {
    return buildLiftHistories(sessions).sort((a, b) => b.points.length - a.points.length);
  }, [sessions]);

  const multiBlock = useMemo(() => new Set(sessions.map((s) => s.block)).size > 1, [sessions]);

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 36 }}>
      <button onClick={onBack} className="p-nav-btn">
        ← Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
        Your <span style={{ color: "var(--t-flame)" }}>progress</span>
      </h1>
      <p style={{ color: "var(--t-muted)", fontSize: 13, margin: "0 0 18px" }}>
        Every loaded lift across the block{multiBlock ? "s" : ""}. ✦ marks a new best.
      </p>

      {histories.length === 0 ? (
        <div className="t-card" style={{ textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📈</div>
          <p style={{ color: "var(--t-muted)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Log a few weighted sets and your strength trend shows up here — weight and volume,
            week over week.
          </p>
        </div>
      ) : (
        <>
          <div className="p-side-toggle" style={{ marginBottom: 18 }}>
            <button className={metric === "weight" ? "active" : ""} onClick={() => setMetric("weight")}>Working weight</button>
            <button className={metric === "volume" ? "active" : ""} onClick={() => setMetric("volume")}>Volume</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {histories.map((h) => (
              <LiftChart key={h.exerciseId} hist={h} metric={metric} multiBlock={multiBlock} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LiftChart({ hist, metric, multiBlock }: { hist: LiftHistory; metric: Metric; multiBlock: boolean }) {
  const ex = getExercise(hist.exerciseId);
  const values = hist.points.map((p) => (metric === "weight" ? p.workingWeight ?? 0 : p.volume));
  const max = Math.max(1, ...values);
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;

  return (
    <div className="t-card" style={{ padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{ex?.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hist.name}</div>
          <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
            {metric === "weight"
              ? `best ${hist.bestWeight ?? "—"} lb`
              : `${first.toLocaleString()} → ${last.toLocaleString()} lb·reps`}
          </div>
        </div>
        {delta !== 0 && (
          <span className="t-mono" style={{ fontSize: 12, color: delta > 0 ? "var(--t-amber)" : "var(--t-faint)" }}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString()}
          </span>
        )}
      </div>

      <div className="p-chart">
        <div className="p-bars">
          {hist.points.map((p, i) => {
            const v = values[i];
            const pct = Math.round((v / max) * 100);
            return (
              <div key={i} className="p-bar-col">
                <span className="p-bar-val">{p.isPR && metric === "weight" ? "✦" : ""}{metric === "weight" ? (p.workingWeight ?? 0) : abbreviate(p.volume)}</span>
                <div
                  className={`p-bar${p.isPR && metric === "weight" ? " pr" : ""}`}
                  style={{ height: `${Math.max(4, pct)}%` }}
                  title={`${multiBlock ? `Block ${p.block} · ` : ""}Week ${p.week} Day ${p.day}: ${v.toLocaleString()}`}
                />
                <span className="p-bar-label">{multiBlock ? `B${p.block}W${p.week}` : `W${p.week}`}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function abbreviate(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
