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
  revealed: boolean;    // its clue is shown on the card
  clueText: string;
  error: boolean;
  tag: number;          // 0 = no tag, 1..4 = colour
  hint: HintRole;
  hasNote: boolean;
  onOpen: () => void;   // opens the centered verdict / note modal
  onTag: () => void;
}

// Fixed-size card: every card is the same height whether or not a clue is shown,
// so revealing a clue never reflows the board. Clue text lives on the card,
// statically readable, like the source game.
export default function SuspectCard({
  coord, name, profession, avatar, mark, isStart, revealed, clueText, error, tag, hint, hasNote,
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
      {hasNote && <span className="cl-note-flag" aria-label="has a note" title="Note to self">✎</span>}

      <div className="cl-card-top">
        <div className="cl-avatar" aria-hidden>{avatar}</div>
        <div className="cl-name">{name}</div>
        <div className="cl-prof">{profession}</div>
      </div>

      <div className="cl-card-body">
        {revealed
          ? <p className="cl-clue">{clueText}</p>
          : mark
            ? <span className="cl-verdict">{mark === "criminal" ? "Criminal" : "Innocent"}</span>
            : <span className="cl-tap-hint">tap to judge</span>}
      </div>
    </div>
  );
}
