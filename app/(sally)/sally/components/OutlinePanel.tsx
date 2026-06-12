"use client";

import { useState } from "react";
import type { Outline } from "@/lib/sally/types";

// The outline card — Sally's pitch (PRD §8.4/§8.5). Iterating creates a new
// version; "Approve outline & start writing" is the Phase 1 → 2 gate and the
// one ember-filled control on this surface.
export default function OutlinePanel({
  outline,
  totalVersions,
  busy,
  approvedAlready,
  onRepitch,
  onApprove,
}: {
  outline: Outline;
  totalVersions: number;
  busy: boolean;
  approvedAlready: boolean; // viewing an approved blueprint from a later phase
  onRepitch: (feedback: string) => void;
  onApprove: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="sb-panel sb-fadein">
      <div className="sb-outline-head">
        <div>
          <div className="sb-eyebrow">Sally&apos;s pitch · outline v{outline.version}{totalVersions > 1 ? ` of ${totalVersions}` : ""}</div>
          <h2 className="sb-serif sb-outline-title">{outline.workingTitle}</h2>
        </div>
        {outline.approved && <span className="sb-approved-chip">Approved ✓</span>}
      </div>

      <dl className="sb-outline-grid">
        <div><dt>Emotional core</dt><dd>{outline.emotionalCore}</dd></div>
        <div><dt>Arc</dt><dd>{outline.emotionalArc}</dd></div>
        <div><dt>Central metaphor</dt><dd>{outline.centralMetaphor}</dd></div>
        {outline.lateTurn && <div><dt>The late turn</dt><dd>{outline.lateTurn}</dd></div>}
        <div><dt>Chorus concept</dt><dd>{outline.chorusConcept}</dd></div>
      </dl>

      <div className="sb-outline-structure">
        <div className="sb-eyebrow">Structure</div>
        <ol>
          {outline.structure.map((s, i) => (
            <li key={i}>
              <span className="sb-mono sb-sec-label">{s.label}</span>
              <span className="sb-sec-summary">{s.summary}</span>
            </li>
          ))}
        </ol>
      </div>

      {outline.reasoning && <p className="sb-outline-reasoning">{outline.reasoning}</p>}

      {!outline.approved ? (
        <div className="sb-outline-actions">
          {showFeedback ? (
            <div className="sb-feedback-box">
              <textarea
                rows={3}
                value={feedback}
                placeholder="What should change? Keep what you like, name what you'd cut…"
                onChange={(e) => setFeedback(e.target.value)}
                disabled={busy}
              />
              <div className="sb-row-gap">
                <button
                  className="sb-btn sb-btn-ghost"
                  disabled={busy || !feedback.trim()}
                  onClick={() => { onRepitch(feedback.trim()); setFeedback(""); setShowFeedback(false); }}
                >
                  {busy ? "Re-pitching…" : "Re-pitch the outline"}
                </button>
                <button className="sb-btn sb-btn-quiet" onClick={() => setShowFeedback(false)} disabled={busy}>
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button className="sb-btn sb-btn-ghost" onClick={() => setShowFeedback(true)} disabled={busy}>
              Ask for changes
            </button>
          )}
          <button className="sb-btn sb-btn-primary sb-gate-btn" onClick={onApprove} disabled={busy}>
            Approve outline &amp; start writing →
          </button>
        </div>
      ) : approvedAlready ? (
        <div className="sb-outline-actions">
          {showFeedback ? (
            <div className="sb-feedback-box">
              <textarea
                rows={3}
                value={feedback}
                placeholder="What needs to change about the blueprint?"
                onChange={(e) => setFeedback(e.target.value)}
                disabled={busy}
              />
              <div className="sb-row-gap">
                <button
                  className="sb-btn sb-btn-ghost"
                  disabled={busy || !feedback.trim()}
                  onClick={() => { onRepitch(feedback.trim()); setFeedback(""); setShowFeedback(false); }}
                >
                  {busy ? "Re-pitching…" : "Re-work the blueprint"}
                </button>
                <button className="sb-btn sb-btn-quiet" onClick={() => setShowFeedback(false)} disabled={busy}>
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button className="sb-btn sb-btn-ghost" onClick={() => setShowFeedback(true)} disabled={busy}>
              Re-open the blueprint
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
