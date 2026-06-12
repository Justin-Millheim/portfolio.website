"use client";

import type { Exercise } from "@/lib/program/types";

// "How do I do this" drill-down. The headline difference from /train: the
// "See how it's done" links are the COACH'S OWN demo videos pulled from the
// source spreadsheet, not a generic web search.
export default function ExerciseModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const links = exercise.videoLinks
    ?? (exercise.videoUrl ? [{ label: "Watch the demo", url: exercise.videoUrl }] : []);

  return (
    <div className="t-modal-scrim" onClick={onClose}>
      <div className="t-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 40 }}>{exercise.emoji}</div>
            <h2 style={{ fontSize: 24, margin: "6px 0 2px" }}>{exercise.name}</h2>
            <div className="t-eyebrow" style={{ color: "var(--t-flame)" }}>{exercise.cue}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#999",
              borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
          {exercise.loaded ? <Tag label="Uses weight" accent /> : <Tag label="Bodyweight" />}
        </div>

        {links.length > 0 && (
          <Section title="See how it's done">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {links.map((l, i) => (
                <a
                  key={i}
                  className="p-video-link"
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ {l.label}
                </a>
              ))}
            </div>
            <p style={{ ...pStyle, fontSize: 12, color: "var(--t-faint)", marginTop: 8 }}>
              Your coach&apos;s demo {links.length > 1 ? "videos" : "video"} — opens in a new tab.
            </p>
          </Section>
        )}

        <Section title="Setup">
          <p style={pStyle}>{exercise.howTo.setup}</p>
        </Section>

        <Section title="How to do it">
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {exercise.howTo.steps.map((s, i) => (
              <li key={i} style={{ ...pStyle, marginBottom: 6 }}>{s}</li>
            ))}
          </ol>
        </Section>

        <Section title="Common mistakes">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {exercise.howTo.mistakes.map((s, i) => (
              <li key={i} style={{ ...pStyle, marginBottom: 6 }}>{s}</li>
            ))}
          </ul>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          <Mod label="Make it easier" body={exercise.howTo.easier} />
          <Mod label="Make it harder" body={exercise.howTo.harder} />
        </div>
      </div>
    </div>
  );
}

const pStyle: React.CSSProperties = { fontSize: 14, color: "#bdb6ab", lineHeight: 1.65, margin: 0 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="t-eyebrow" style={{ marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Tag({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className="t-mono"
      style={{
        fontSize: 11, padding: "6px 10px", borderRadius: 8,
        background: accent ? "rgba(255,90,30,0.15)" : "#161616",
        border: `1px solid ${accent ? "var(--t-flame)" : "#222"}`,
        color: accent ? "var(--t-amber)" : "#999",
      }}
    >
      {label}
    </span>
  );
}

function Mod({ label, body }: { label: string; body: string }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "12px 14px" }}>
      <div className="t-eyebrow" style={{ color: "var(--t-amber)", marginBottom: 4 }}>{label}</div>
      <p style={{ ...pStyle, fontSize: 13 }}>{body}</p>
    </div>
  );
}
