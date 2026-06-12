"use client";

import { useRef, useState } from "react";

interface Slide {
  emoji: string;
  title: React.ReactNode;
  body: React.ReactNode;
  foot?: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    emoji: "🔥",
    title: <>Welcome to <span style={{ color: "var(--t-flame)" }}>The Block</span></>,
    body: "Your coach's fixed 4-week program — 4 days a week, 16 sessions total. Same lifts each week, a little more each time. No guessing what to do.",
    foot: "Move at your own pace, stop if something hurts, and check with a doctor before starting a new program.",
  },
  {
    emoji: "🗓️",
    title: <>One block, four weeks</>,
    body: "Every session is a set Day × Week. The app always knows what's up next and walks you to it — Week 1 Day 1, all the way to Week 4 Day 4.",
  },
  {
    emoji: "📝",
    title: <>Log it as you lift</>,
    body: "Weight, reps, time — logged mid-set with a tap. Come back next week and you'll see exactly what you did last time, with a smart next-step hint.",
  },
  {
    emoji: "⇄",
    title: <>No equipment? Swap it</>,
    body: "Missing a machine? Swap any lift for a curated equivalent. Your progress still tracks under the original move, so the chart never splits.",
  },
  {
    emoji: "📈",
    title: <>Watch the block add up</>,
    body: "Every lift's weight and volume trend across the 4 weeks — and across repeat blocks. Create an account to keep it safe across devices.",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const last = i === SLIDES.length - 1;

  function go(n: number) {
    setI((cur) => Math.max(0, Math.min(SLIDES.length - 1, cur + n)));
  }
  function onPointerDown(e: React.PointerEvent) { startX.current = e.clientX; }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx < -45) go(1);
    else if (dx > 45) go(-1);
  }

  const s = SLIDES[i];

  return (
    <div
      className="t-wrap"
      style={{ paddingTop: 24, minHeight: "100dvh", display: "flex", flexDirection: "column", maxWidth: 460 }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="t-accent-tr" />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onDone} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 13, cursor: "pointer", padding: 6 }}>
          Skip
        </button>
      </div>

      <div key={i} className="t-fadein" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: "0 6px" }}>
        <div style={{ fontSize: 76, marginBottom: 10 }}>{s.emoji}</div>
        <h1 style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.2, margin: "0 0 14px" }}>{s.title}</h1>
        <p style={{ fontSize: 16, color: "var(--t-muted)", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
        {s.foot && (
          <p style={{ fontSize: 12, color: "var(--t-faint)", lineHeight: 1.5, margin: "22px 0 0" }}>
            ⚠️ {s.foot}
          </p>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "8px 0 18px" }}>
        {SLIDES.map((_, n) => (
          <button
            key={n}
            aria-label={`Go to slide ${n + 1}`}
            onClick={() => setI(n)}
            style={{
              width: n === i ? 22 : 8, height: 8, borderRadius: 8, border: "none", cursor: "pointer",
              background: n === i ? "var(--t-flame)" : "#3a3a3a", transition: "width 0.2s, background 0.2s",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        {i > 0 && <button className="t-btn t-btn-quiet" style={{ flex: "0 0 auto", width: 110 }} onClick={() => go(-1)}>← Back</button>}
        <button className="t-btn t-btn-primary" style={{ flex: 1 }} onClick={() => (last ? onDone() : go(1))}>
          {last ? "Let's go →" : "Next →"}
        </button>
      </div>
    </div>
  );
}
