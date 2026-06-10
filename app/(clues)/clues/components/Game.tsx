"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Puzzle, Status } from "@/lib/clues/types";
import { renderClue, clueMentions } from "@/lib/clues/clues";
import { nextHint } from "@/lib/clues/solver";
import { SIZE, coord } from "@/lib/clues/grid";
import SuspectCard, { type HintRole } from "./SuspectCard";
import SuspectModal from "./SuspectModal";
import WinOverlay from "./WinOverlay";

const TAG_COUNT = 4;

export interface GameState {
  marks: (Status | null)[];
  tags: number[];
  notes: string[];
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
  speakers: number[]; // revealed clues (by speaker) that together pin the target
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
  const [notes, setNotes] = useState<string[]>(() =>
    initial?.notes?.length === SIZE ? initial.notes : new Array(SIZE).fill(""));
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
    onChange({ marks, tags, notes, hintsUsed, errors, startedAt });
  }, [marks, tags, notes, hintsUsed, errors, startedAt, onChange]);

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

  const setNote = useCallback((i: number, text: string) => {
    setNotes((prev) => {
      if (prev[i] === text) return prev;
      const next = prev.slice();
      next[i] = text;
      return next;
    });
  }, []);

  // Hints reason only from verdicts the player has correct, so a stray wrong
  // mark never sends the hint down a false path.
  const requestHint = useCallback(() => {
    if (hint && hint.level === 1) { setHint({ ...hint, level: 2 }); return; }
    const known = marks.map((v, i) => (v === puzzle.solution[i] ? v : null));
    const step = nextHint(puzzle.clues, known, 2);
    if (!step) return;
    // the revealed clues that talk about the deducible suspect — the ones to read
    const speakers = Array.from(new Set(
      puzzle.clues
        .filter((c) => known[c.speaker] !== null && clueMentions(c, step.index))
        .map((c) => c.speaker),
    ));
    setHint({ level: 1, speakers: speakers.length ? speakers : [step.index], target: step.index });
    setHintsUsed((h) => h + 1);
    setSelected(null);
  }, [puzzle, marks, hint]);

  const hintRole = useCallback((i: number): HintRole => {
    if (!hint) return null;
    if (hint.level >= 2 && i === hint.target) return "target";
    if (hint.speakers.includes(i)) return "speaker";
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
              revealed={revealed}
              clueText={renderClue(puzzle.clues[s.id], puzzle.suspects)}
              error={m !== null && m !== puzzle.solution[s.id]}
              tag={tags[s.id]}
              hint={hintRole(s.id)}
              hasNote={!!notes[s.id]?.trim()}
              onOpen={() => setSelected(s.id)}
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
            ? "Read the highlighted clues together — they pin down one more suspect."
            : `You can now identify ${puzzle.suspects[hint.target].name}.`}
        </p>
      )}

      {selected !== null && (() => {
        const s = puzzle.suspects[selected];
        return (
          <SuspectModal
            coord={coord(selected)}
            name={s.name}
            profession={s.profession}
            avatar={s.avatar}
            mark={marks[selected]}
            isStart={selected === puzzle.start}
            revealed={selected === puzzle.start || marks[selected] === puzzle.solution[selected]}
            clueText={renderClue(puzzle.clues[selected], puzzle.suspects)}
            note={notes[selected] ?? ""}
            onMark={(st) => setMark(selected, st)}
            onClear={() => clearMark(selected)}
            onNote={(text) => setNote(selected, text)}
            onClose={() => setSelected(null)}
          />
        );
      })()}

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
