"use client";

import { useState } from "react";
import type { Mode, Song } from "@/lib/sally/types";
import { MODE_LABELS } from "@/lib/sally/types";

// Phase 1 work surface: the mode selector cards and the style-reference lock —
// the two hard gate inputs (PRD §8.2/§8.3). Abstract-only style descriptions
// are blocked with a nudge unless "you choose blind" is toggled.

const MODES: Mode[] = ["gift", "anthemic", "confessional_rap", "double_entendre"];

// A reference "looks specific" when it names a thing: quotes, a by-line, or a
// couple of proper nouns. "indie folk" fails; `"Love the Way You Lie"` passes.
export function looksLikeReference(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/["“”']/.test(t)) return true;
  if (/\bby\b/i.test(t)) return true;
  if (/[-–—,]/.test(t) && /[A-Z]/.test(t)) return true;
  const proper = t.split(/[^A-Za-z']+/).filter((w) => w.length > 2 && /^[A-Z]/.test(w));
  return proper.length >= 2;
}

export default function IntakePanel({
  song,
  busy,
  onPickMode,
  onLockStyle,
  onUnlockStyle,
  onBlindToggle,
}: {
  song: Song;
  busy: boolean;
  onPickMode: (mode: Mode) => void;
  onLockStyle: (reference: string) => void;
  onUnlockStyle: () => void;
  onBlindToggle: (blind: boolean) => void;
}) {
  const [styleText, setStyleText] = useState(song.styleReference ?? "");
  const [nudge, setNudge] = useState<string | null>(null);

  const locked = song.styleLocked || song.styleBlind;

  function tryLock() {
    const t = styleText.trim();
    if (!t) {
      setNudge("Give me one specific song to point at — or flip \"you choose blind\" and I'll fly solo.");
      return;
    }
    if (!looksLikeReference(t)) {
      setNudge(
        "That's a genre, not a reference. Give me one specific song — \"something like 'Love the Way You Lie'\" — even if it's not a perfect match. Or toggle \"you choose blind.\"",
      );
      return;
    }
    setNudge(null);
    onLockStyle(t);
  }

  return (
    <div className="sb-panel sb-fadein">
      <div className="sb-panel-block">
        <div className="sb-eyebrow">Mode</div>
        <p className="sb-hint">What kind of song is this? Mode drives the whole bar architecture.</p>
        <div className="sb-mode-grid">
          {MODES.map((m) => (
            <button
              key={m}
              className={`sb-mode-card ${song.mode === m ? "picked" : ""}`}
              onClick={() => onPickMode(m)}
              disabled={busy}
            >
              <span className="sb-mode-name">{MODE_LABELS[m].name}</span>
              <span className="sb-mode-blurb">{MODE_LABELS[m].blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sb-panel-block">
        <div className="sb-eyebrow">Style reference — required</div>
        <p className="sb-hint">
          One specific song beats a genre every time. &ldquo;Something like &lsquo;Fast Car&rsquo;&rdquo; is perfect.
        </p>

        {song.styleBlind ? (
          <div className="sb-style-locked">
            <span className="sb-lock-chip blind">You chose blind — Sally picks the lane</span>
            <button className="sb-btn sb-btn-quiet" onClick={() => onBlindToggle(false)} disabled={busy}>
              Take it back
            </button>
          </div>
        ) : song.styleLocked ? (
          <div className="sb-style-locked">
            <span className="sb-lock-chip">🔒 {song.styleReference}</span>
            <button className="sb-btn sb-btn-quiet" onClick={onUnlockStyle} disabled={busy}>
              Unlock
            </button>
          </div>
        ) : (
          <>
            <div className="sb-style-row">
              <input
                value={styleText}
                onChange={(e) => { setStyleText(e.target.value); setNudge(null); }}
                placeholder={`e.g. "Love the Way You Lie" — or 2–3 artists with a blend`}
                onKeyDown={(e) => e.key === "Enter" && tryLock()}
                disabled={busy}
              />
              <button className="sb-btn sb-btn-ghost" onClick={tryLock} disabled={busy}>
                Lock it
              </button>
            </div>
            {nudge && <p className="sb-nudge">{nudge}</p>}
            <label className="sb-blind-toggle">
              <input
                type="checkbox"
                checked={song.styleBlind}
                onChange={(e) => onBlindToggle(e.target.checked)}
                disabled={busy}
              />
              <span><b>You choose blind</b> — skip the reference and trust Sally&apos;s instincts</span>
            </label>
          </>
        )}
      </div>

      {!locked || !song.mode ? (
        <p className="sb-gate-note sb-mono">
          {!song.mode && !locked
            ? "Pick a mode and lock a style — then Sally pitches the outline."
            : !song.mode
              ? "Pick a mode and Sally can pitch the outline."
              : "Lock a style reference (or go blind) to unlock the outline."}
        </p>
      ) : null}
    </div>
  );
}
