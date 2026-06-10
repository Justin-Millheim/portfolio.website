"use client";

import type { Status } from "@/lib/clues/types";

export type HintRole = "speaker" | "region" | "target" | null;

interface Props {
  coord: string;
  name: string;
  profession: string;
  avatar: string;
  mark: Status | null;
  isStart: boolean;
  revealed: boolean;    // its clue is available (shown in the modal / clue list)
  error: boolean;
  tag: number;          // 0 = no tag, 1..4 = colour
  hint: HintRole;
  hasNote: boolean;
  onOpen: () => void;   // opens the centered suspect modal
  onTag: () => void;
}

export default function SuspectCard({
  coord, name, profession, avatar, mark, isStart, revealed, error, tag, hint, hasNote,
  onOpen, onTag,
}: Props) {
  const cls = [
    "cl-card",
    mark ? `is-${mark}` : "is-blank",
    error ? "is-error" : "",
    hint ? `hint-${hint}` : "",
    tag ? `tag-${tag}` : "",
    revealed ? "is-revealed" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} onClick={onOpen} role="button" tabIndex={0}>
      <span className="cl-coord">{coord}</span>
      <button
        className="cl-tag-dot"
        aria-label="cycle colour tag"
        onClick={(e) => { e.stopPropagation(); onTag(); }}
      />

      <div className="cl-avatar" aria-hidden>{avatar}</div>
      <div className="cl-name">{name}</div>
      <div className="cl-prof">{profession}</div>

      {mark && <div className="cl-verdict">{mark === "criminal" ? "Criminal" : "Innocent"}</div>}
      {isStart && !mark && <div className="cl-given">given</div>}

      {revealed && <span className="cl-clue-flag" aria-hidden>“”</span>}
      {hasNote && <span className="cl-note-flag" aria-label="has a note" title="Note to self">✎</span>}
    </div>
  );
}
