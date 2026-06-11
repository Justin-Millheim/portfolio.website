"use client";

import { useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/clues/types";

const NOTE_MAX = 300;

interface Props {
  coord: string;
  name: string;
  profession: string;
  avatar: string;
  mark: Status | null;
  isStart: boolean;
  revealed: boolean;
  clueText: string;
  explainText: string;
  dimmed: boolean;
  note: string;
  markError: string | null;
  onMark: (s: Status) => void;
  onClear: () => void;
  onNote: (text: string) => void;
  onClose: () => void;
}

// Centered, screen-stable suspect sheet. Opening it never reflows the board:
// verdict choice, the plain-English clue translation, and the note all live here.
export default function SuspectModal({
  coord, name, profession, avatar, mark, isStart, revealed, clueText, explainText, dimmed, note, markError,
  onMark, onClear, onNote, onClose,
}: Props) {
  const [draft, setDraft] = useState(note);
  const [showExplain, setShowExplain] = useState(false);
  const saved = useRef(note);

  // persist the note on unmount / close so we don't thrash storage per keystroke
  useEffect(() => {
    saved.current = note;
  }, [note]);
  const commit = (text: string) => { if (text !== saved.current) onNote(text); };

  return (
    <div className="cl-overlay" onClick={() => { commit(draft); onClose(); }}>
      <div className="cl-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="cl-sheet-x" onClick={() => { commit(draft); onClose(); }} aria-label="close">✕</button>

        <div className="cl-sheet-head">
          <span className="cl-sheet-avatar" aria-hidden>{avatar}</span>
          <div>
            <div className="cl-sheet-name">{name}</div>
            <div className="cl-sheet-sub cl-mono">{coord} · {profession}</div>
          </div>
        </div>

        {revealed && clueText ? (
          <>
            <p className="cl-sheet-clue">“{clueText}”</p>
            <button className="cl-explain-toggle" onClick={() => setShowExplain((v) => !v)}>
              {showExplain ? "Hide" : "What this means"}
            </button>
            {showExplain && <p className="cl-sheet-explain">{explainText}</p>}
          </>
        ) : (
          <p className="cl-sheet-clue cl-sheet-clue-locked">Clue reveals once you correctly identify {name}.</p>
        )}

        {isStart ? (
          <div className="cl-sheet-given cl-mono">Revealed for free · {mark === "criminal" ? "Criminal" : "Innocent"}</div>
        ) : (
          <div className="cl-sheet-verdicts">
            <button
              className={`cl-verdict-btn inn ${mark === "innocent" ? "on" : ""}`}
              onClick={() => onMark("innocent")}
            >Innocent</button>
            <button
              className={`cl-verdict-btn cri ${mark === "criminal" ? "on" : ""}`}
              onClick={() => onMark("criminal")}
            >Criminal</button>
            <button className="cl-verdict-btn clr" onClick={onClear}>{dimmed ? "Cleared" : "Clear"}</button>
          </div>
        )}

        {markError && <p className="cl-mark-error">{markError}</p>}

        <label className="cl-note-label cl-mono" htmlFor="cl-note">Note to self</label>
        <textarea
          id="cl-note"
          className="cl-note-input"
          value={draft}
          maxLength={NOTE_MAX}
          placeholder="Track a hunch about this suspect…"
          onChange={(e) => setDraft(e.target.value.slice(0, NOTE_MAX))}
          onBlur={() => commit(draft)}
          rows={3}
        />
        <div className="cl-note-count cl-mono">{draft.length}/{NOTE_MAX}</div>
      </div>
    </div>
  );
}
