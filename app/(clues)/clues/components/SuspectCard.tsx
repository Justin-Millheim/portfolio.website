"use client";

import type { Status } from "@/lib/clues/types";

export type HintRole = "speaker" | "region" | "target" | null;

interface Props {
  coord: string;         // grid label, e.g. "A1"
  name: string;
  profession: string;
  avatar: string;
  mark: Status | null;
  isStart: boolean;
  selected: boolean;
  revealed: boolean;     // show this suspect's clue text
  clueText: string;
  error: boolean;        // marked, but contradicts the solution
  tag: number;           // 0 = no tag, 1..4 = colour
  hint: HintRole;
  onSelect: () => void;
  onMark: (s: Status) => void;
  onClear: () => void;
  onTag: () => void;
}

export default function SuspectCard({
  coord, name, profession, avatar, mark, isStart, selected, revealed, clueText, error, tag, hint,
  onSelect, onMark, onClear, onTag,
}: Props) {
  const cls = [
    "cl-card",
    mark ? `is-${mark}` : "is-blank",
    selected ? "is-selected" : "",
    error ? "is-error" : "",
    hint ? `hint-${hint}` : "",
    tag ? `tag-${tag}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} onClick={onSelect} role="button" tabIndex={0}>
      <span className="cl-coord">{coord}</span>
      <button
        className="cl-tag-dot"
        aria-label="cycle colour tag"
        onClick={(e) => { e.stopPropagation(); onTag(); }}
      />

      <div className="cl-avatar" aria-hidden>{avatar}</div>
      <div className="cl-name">{name}</div>
      <div className="cl-prof">{profession}</div>

      {mark && (
        <div className="cl-verdict">{mark === "criminal" ? "Criminal" : "Innocent"}</div>
      )}
      {isStart && <div className="cl-given">given</div>}

      {revealed && clueText && <p className="cl-clue">{clueText}</p>}

      {selected && !isStart && (
        <div className="cl-actions" onClick={(e) => e.stopPropagation()}>
          <button className="cl-mark cl-mark-inn" onClick={() => onMark("innocent")}>Innocent</button>
          <button className="cl-mark cl-mark-cri" onClick={() => onMark("criminal")}>Criminal</button>
          {mark && <button className="cl-mark cl-mark-clear" onClick={onClear}>Clear</button>}
        </div>
      )}
    </div>
  );
}
