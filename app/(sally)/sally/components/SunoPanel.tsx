"use client";

import { useState } from "react";
import type { SunoPrompt } from "@/lib/sally/types";
import SallyMark from "./SallyMark";

// Phase 4 — the booth (PRD §11). Copy-ready prompt block with a live character
// counter against the hard 1,000 cap, variation notes kept separate so they
// never eat the budget, and the delivery-cue reminder.
export default function SunoPanel({
  suno,
  busy,
  onGenerate,
  onCopy,
}: {
  suno: SunoPrompt | null;
  busy: boolean;
  onGenerate: (note?: string) => void;
  onCopy: (text: string) => void;
}) {
  const [note, setNote] = useState("");
  const over = (suno?.charCount ?? 0) > 1000;

  return (
    <div className="sb-panel sb-fadein">
      <div className="sb-eyebrow">The booth — Suno production prompt</div>

      {!suno && !busy && (
        <div className="sb-write-cta">
          <div className="sb-bob"><SallyMark size={84} expression="idle" /></div>
          <button className="sb-btn sb-btn-primary sb-gate-btn sb-big" onClick={() => onGenerate()}>
            Cut the Suno prompt →
          </button>
          <p className="sb-hint">Sonic qualities only — no artist names, under 1,000 characters, ready to paste.</p>
        </div>
      )}

      {busy && (
        <div className="sb-writing-state">
          <div className="sb-bob"><SallyMark size={84} expression="thinking" /></div>
          <div className="sb-mono sb-writing-copy">Sally&apos;s in the booth…</div>
        </div>
      )}

      {suno && !busy && (
        <>
          <div className="sb-suno-block">
            <div className="sb-suno-text sb-mono">{suno.prompt}</div>
            <div className="sb-suno-meta">
              <span className={`sb-mono sb-charcount ${over ? "over" : ""}`}>
                {suno.charCount} / 1000
              </span>
              <button className="sb-btn sb-btn-ghost" onClick={() => onCopy(suno.prompt)}>⧉ Copy prompt</button>
            </div>
          </div>

          {suno.variations.length > 0 && (
            <div className="sb-suno-variations">
              <div className="sb-eyebrow">Variation notes (kept out of the prompt budget)</div>
              <ul>
                {suno.variations.map((v, i) => (
                  <li key={i}>
                    {v}{" "}
                    <button className="sb-tool" onClick={() => onCopy(v)} title="Copy variation">⧉</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="sb-suno-reminder">
            The bracketed delivery cues in your lyric sheet — <span className="sb-mono">[rapped softly]</span>,{" "}
            <span className="sb-mono">[sung]</span>, <span className="sb-mono">[half-time]</span> — parse as
            production direction in Suno. Paste the lyrics with the brackets intact; if Suno misreads a section,
            add an inline <span className="sb-mono">[rap]</span> or <span className="sb-mono">[sung]</span> at the
            start of its first line.
          </p>

          <div className="sb-recut">
            <input
              value={note}
              placeholder="Different direction? (e.g. slower, warmer vocal, more cinematic)"
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              className="sb-btn sb-btn-ghost"
              onClick={() => { onGenerate(note.trim() || undefined); setNote(""); }}
            >
              Re-cut the prompt
            </button>
          </div>
        </>
      )}
    </div>
  );
}
