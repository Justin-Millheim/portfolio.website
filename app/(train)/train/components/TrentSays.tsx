"use client";

import Trent from "./Trent";

// Trent's coach bubble: his face + a first-person line. The recurring "voice of
// Trent" element used across check-ins, empty states, and intros.
export default function TrentSays({
  children,
  size = 64,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", ...style }}>
      <Trent size={size} style={{ flex: "0 0 auto" }} />
      <div
        style={{
          position: "relative", flex: 1,
          background: "var(--t-surface2)", border: "1px solid var(--t-line)",
          borderRadius: 14, padding: "12px 14px",
        }}
      >
        {/* little speech-bubble tail pointing at Trent */}
        <span style={{ position: "absolute", left: -7, top: 18, width: 12, height: 12, background: "var(--t-surface2)", borderLeft: "1px solid var(--t-line)", borderBottom: "1px solid var(--t-line)", transform: "rotate(45deg)" }} />
        <p style={{ margin: 0, fontSize: 14, color: "var(--t-ink)", lineHeight: 1.5 }}>{children}</p>
      </div>
    </div>
  );
}
