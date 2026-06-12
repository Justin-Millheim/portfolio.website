"use client";

// Sticky top bar used across tabs. Left can be a title block or a back button;
// right holds contextual actions (account, menu, sort…).
export default function TopBar({
  left, right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="t-top">
      <div style={{ minWidth: 0 }}>{left}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{right}</div>
    </header>
  );
}
