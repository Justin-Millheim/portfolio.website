"use client";

import type { ProgramProgress } from "@/lib/program/types";
import { completedCount, TOTAL } from "@/lib/program/program-engine";
import { getDay } from "@/lib/program/program";
import Coach from "./Coach";

type Account = { mode: "guest" | "cloud"; email?: string };

export default function Home({
  progress,
  account,
  coachLine,
  upNext,
  onStart,
  onOpenBlock,
  onOpenProgress,
  onOpenHistory,
  onRestartBlock,
  onSignIn,
  onSignOut,
  hasHistory,
}: {
  progress: ProgramProgress;
  account: Account | null;
  coachLine: string;
  upNext: { week: 1 | 2 | 3 | 4; day: 1 | 2 | 3 | 4 } | null;
  onStart: (week: number, day: number) => void;
  onOpenBlock: () => void;
  onOpenProgress: () => void;
  onOpenHistory: () => void;
  onRestartBlock: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  hasHistory: boolean;
}) {
  const done = completedCount(progress);
  const day = upNext ? getDay(upNext.day) : null;
  const blockDone = upNext === null;

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 40 }}>
      <div className="t-accent-tr" />
      <div className="t-accent-bl" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, margin: 0 }}>
          The <span style={{ color: "var(--t-flame)" }}>Block</span>
        </h1>
        <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
          Block {progress.blockNumber}
        </span>
      </div>

      <Coach line={coachLine} />

      {/* Block progress ring */}
      <div className="t-card p-ring-wrap" style={{ marginBottom: 16 }}>
        <Ring done={done} total={TOTAL} />
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Block progress</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {done} <span style={{ color: "var(--t-faint)", fontSize: 14 }}>/ {TOTAL} sessions</span>
          </div>
          <div className="t-mono" style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 2 }}>
            Week {progress.currentWeek} in motion
          </div>
        </div>
      </div>

      {/* Up Next */}
      {blockDone ? (
        <div className="p-upnext" style={{ marginBottom: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>🎉 Block complete</div>
          <h2 style={{ fontSize: 21, margin: "0 0 6px" }}>All 16 sessions done.</h2>
          <p style={{ color: "var(--t-muted)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 }}>
            Start a fresh block to keep the progression going — your history is kept, so the
            chart shows the long-term trend.
          </p>
          <button className="t-btn t-btn-primary" onClick={onRestartBlock}>🔁 Restart the block</button>
        </div>
      ) : (
        <div className="p-upnext" style={{ marginBottom: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>Up next</div>
          <h2 style={{ fontSize: 21, margin: "0 0 2px" }}>
            Week {upNext!.week}, Day {upNext!.day}
          </h2>
          <p style={{ color: "var(--t-amber)", fontSize: 14, margin: "0 0 16px" }}>
            {day?.title}
          </p>
          <button className="t-btn t-btn-primary" onClick={() => onStart(upNext!.week, upNext!.day)}>
            Start this session →
          </button>
          <button className="t-btn t-btn-quiet" style={{ marginTop: 10 }} onClick={onOpenBlock}>
            Do a different day
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button className="t-btn t-btn-ghost" onClick={onOpenBlock}>🗺️ The block</button>
        <button className="t-btn t-btn-ghost" onClick={onOpenProgress}>📈 Progress</button>
      </div>
      {hasHistory && (
        <button className="t-btn t-btn-quiet" onClick={onOpenHistory}>📓 Session history</button>
      )}

      {/* account status line */}
      <div style={{ marginTop: 22, textAlign: "center" }}>
        {account?.mode === "cloud" ? (
          <p className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
            Synced as {account.email ?? "your account"} ·{" "}
            <button onClick={onSignOut} style={linkBtn}>Sign out</button>
          </p>
        ) : (
          <p className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
            Guest — on this device only ·{" "}
            <button onClick={onSignIn} style={linkBtn}>Sign in to sync</button>
          </p>
        )}
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "var(--t-amber)", fontSize: 11,
  cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0,
};

function Ring({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" style={{ flex: "0 0 auto" }} aria-hidden>
      <circle cx="38" cy="38" r={r} fill="none" stroke="#262626" strokeWidth="7" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke="url(#pgrad)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 38 38)"
      />
      <defs>
        <linearGradient id="pgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--t-flame)" />
          <stop offset="100%" stopColor="var(--t-amber)" />
        </linearGradient>
      </defs>
      <text x="38" y="43" textAnchor="middle" fill="var(--t-ink)" fontSize="18" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
