"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Puzzle, Status } from "@/lib/clues/types";
import { renderClue } from "@/lib/clues/clues";
import { nextDeduction } from "@/lib/clues/solver";
import { SIZE, coord } from "@/lib/clues/grid";
import SuspectCard, { type HintRole } from "./SuspectCard";
import WinOverlay from "./WinOverlay";

const TAG_COUNT = 4;

export interface GameState {
  marks: (Status | null)[];
  tags: number[];
  hintsUsed: number;
  errors: number;
  startedAt: number;
}

interface Props {
  puzzle: Puzzle;
  label: string;
  initial: GameState | null;
  onChange: (s: GameState) => void;
  onSolved: () => void;
  onBack: () => void;
  onNext: () => void;
}

interface Hint {
  level: 1 | 2;
  speaker: number;
  region: number[];
  target: number;
}

function freshMarks(puzzle: Puzzle): (Status | null)[] {
  const marks = new Array(SIZE).fill(null) as (Status | null)[];
  marks[puzzle.start] = puzzle.solution[puzzle.start]; // the free reveal
  return marks;
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Game({ puzzle, label, initial, onChange, onSolved, onBack, onNext }: Props) {
  const [marks, setMarks] = useState<(Status | null)[]>(() => initial?.marks ?? freshMarks(puzzle));
  const [tags, setTags] = useState<number[]>(() =>
    initial?.tags?.length === SIZE ? initial.tags : new Array(SIZE).fill(0));
  const [hintsUsed, setHintsUsed] = useState(() => initial?.hintsUsed ?? 0);
  const [errors, setErrors] = useState(() => initial?.errors ?? 0);
  const [startedAt] = useState(() => initial?.startedAt ?? Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [solved, setSolved] = useState(() =>
    (initial?.marks ?? freshMarks(puzzle)).every((v, i) => v === puzzle.solution[i]));
  const [showWin, setShowWin] = useState(false);

  // report progress upward for persistence
  useEffect(() => {
    onChange({ marks, tags, hintsUsed, errors, startedAt });
  }, [marks, tags, hintsUsed, errors, startedAt, onChange]);

  useEffect(() => {
    if (solved) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [solved]);

  const setMark = useCallback((i: number, status: Status) => {
    if (i === puzzle.start) return;
    setHint(null);
    setMarks((prev) => {
      if (prev[i] === status) return prev;
      const next = prev.slice();
      next[i] = status;
      if (status !== puzzle.solution[i]) setErrors((e) => e + 1);
      if (next.every((v, idx) => v === puzzle.solution[idx])) {
        setSolved(true);
        setShowWin(true);
        setSelected(null);
        onSolved();
      }
      return next;
    });
  }, [puzzle, onSolved]);

  const clearMark = useCallback((i: number) => {
    if (i === puzzle.start) return;
    setMarks((prev) => {
      if (prev[i] === null) return prev;
      const next = prev.slice();
      next[i] = null;
      return next;
    });
  }, [puzzle.start]);

  const cycleTag = useCallback((i: number) => {
    setTags((prev) => {
      const next = prev.slice();
      next[i] = (next[i] + 1) % (TAG_COUNT + 1);
      return next;
    });
  }, []);

  // Hints reason only from verdicts the player has correct, so a stray wrong
  // mark never sends the hint down a false path.
  const requestHint = useCallback(() => {
    if (hint && hint.level === 1) { setHint({ ...hint, level: 2 }); return; }
    const known = marks.map((v, i) => (v === puzzle.solution[i] ? v : null));
    const step = nextDeduction(puzzle.clues, known);
    if (!step) return;
    const clue = puzzle.clues[step.by];
    const region =
      clue.kind === "count" || clue.kind === "parity" || clue.kind === "share" || clue.kind === "connected" ? clue.region
      : clue.kind === "compare" ? [...clue.regionA, ...clue.regionB]
      : clue.kind === "most" ? [clue.who]
      : [clue.speaker];
    setHint({ level: 1, speaker: clue.speaker, region, target: step.index });
    setHintsUsed((h) => h + 1);
    setSelected(null);
  }, [puzzle, marks, hint]);

  const hintRole = useCallback((i: number): HintRole => {
    if (!hint) return null;
    if (hint.level >= 2 && i === hint.target) return "target";
    if (i === hint.speaker) return "speaker";
    if (hint.region.includes(i)) return "region";
    return null;
  }, [hint]);

  const labelled = useMemo(() => marks.filter((m) => m !== null).length, [marks]);

  return (
    <div className="cl-wrap">
      <div className="cl-glow cl-glow-tr" />
      <div className="cl-glow cl-glow-bl" />

      <div className="cl-gamebar">
        <button className="cl-back" onClick={onBack}>‹ Library</button>
        <span className="cl-mono cl-gamelabel">{label}</span>
      </div>

      <div className="cl-statusbar">
        <span className="cl-mono">{labelled}/{SIZE} labelled</span>
        <span className="cl-mono cl-clock">{fmtTime(now - startedAt)}</span>
      </div>

      <div className="cl-grid">
        {puzzle.suspects.map((s) => {
          const m = marks[s.id];
          const revealed = s.id === puzzle.start || m === puzzle.solution[s.id];
          return (
            <SuspectCard
              key={s.id}
              coord={coord(s.id)}
              name={s.name}
              profession={s.profession}
              avatar={s.avatar}
              mark={m}
              isStart={s.id === puzzle.start}
              selected={selected === s.id}
              revealed={revealed}
              clueText={renderClue(puzzle.clues[s.id], puzzle.suspects)}
              error={m !== null && m !== puzzle.solution[s.id]}
              tag={tags[s.id]}
              hint={hintRole(s.id)}
              onSelect={() => setSelected((cur) => (cur === s.id ? null : s.id))}
              onMark={(st) => setMark(s.id, st)}
              onClear={() => clearMark(s.id)}
              onTag={() => cycleTag(s.id)}
            />
          );
        })}
      </div>

      <div className="cl-controls">
        <button className="cl-btn cl-btn-primary" onClick={requestHint} disabled={solved}>
          {hint && hint.level === 1 ? "Show the suspect" : "Hint"}
        </button>
        <button className="cl-btn cl-btn-ghost" onClick={onNext}>Next case</button>
      </div>

      {hint && (
        <p className="cl-hint-note">
          {hint.level === 1
            ? "Read the highlighted clue — it pins down one more suspect."
            : `You can now identify ${puzzle.suspects[hint.target].name}.`}
        </p>
      )}

      {showWin && solved && (
        <WinOverlay
          timeLabel={fmtTime(now - startedAt)}
          hintsUsed={hintsUsed}
          errors={errors}
          onNew={onNext}
          onClose={() => setShowWin(false)}
        />
      )}
    </div>
  );
}
