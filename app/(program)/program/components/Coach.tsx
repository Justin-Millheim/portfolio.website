"use client";

// The coach's voice — light and personal, not a mascot. A small speech bubble
// that carries the progression-aware line ("Reps jump this week, weight can
// hold"). This is the personality hook unique to The Block.
export default function Coach({ line, emoji = "🔥" }: { line: string; emoji?: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
      <div
        aria-hidden
        style={{
          flex: "0 0 auto", width: 38, height: 38, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          background: "linear-gradient(135deg, rgba(255,106,50,0.25), rgba(255,174,61,0.12))",
          border: "1px solid var(--t-flame)",
        }}
      >
        {emoji}
      </div>
      <div
        style={{
          position: "relative", flex: 1,
          background: "var(--t-surface2)", border: "1px solid var(--t-line)",
          borderRadius: "4px 14px 14px 14px", padding: "11px 14px",
          fontSize: 14, lineHeight: 1.5, color: "var(--t-ink)",
        }}
      >
        {line}
      </div>
    </div>
  );
}
