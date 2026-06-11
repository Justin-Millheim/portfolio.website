"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Puzzle, Status } from "@/lib/clues/types";
import { renderClue, clueMentions, explainClue } from "@/lib/clues/clues";
import { nextHint, deduceClosure } from "@/lib/clues/solver";
import { SIZE, coord } from "@/lib/clues/grid";
import SuspectCard, { type HintRole } from "./SuspectCard";
import SuspectModal from "./SuspectModal";
import Glossary from "./Glossary";
import WinOverlay from "./WinOverlay";

const TAG_COUNT = 4;

export interface GameState {
  marks: (Status | null)[];
  tags: number[];
  notes: string[];
  dimmed: boolean[];
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
  const [dimmed, setDimmed] = useState<boolean[]>(() =>
    initial?.dimmed?.length === SIZE ? initial.dimmed : new Array(SIZE).fill(false));
  const [hintsUsed, setHintsUsed] = useState(() => initial?.hintsUsed ?? 0);
  const [errors, setErrors] = useState(() => initial?.errors ?? 0);
  const [startedAt] = useState(() => initial?.startedAt ?? Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [solved, setSolved] = useState(() =>
    (initial?.marks ?? freshMarks(puzzle)).every((v, i) => v === puzzle.solution[i]));
  const [showWin, setShowWin] = useState(false);

  // report progress upward for persistence
  useEffect(() => {
    onChange({ marks, tags, notes, dimmed, hintsUsed, errors, startedAt });
  }, [marks, tags, notes, dimmed, hintsUsed, errors, startedAt, onChange]);

  useEffect(() => {
    if (solved) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [solved]);

  const setMark = useCallback((i: number, status: Status) => {
    if (i === puzzle.start) return;
    setHint(null);
    // No guessing: a suspect can only be judged once their verdict is forced by
    // what's already been deduced. Work only from the player's CORRECT marks.
    const known = marks.map((v, j) => (v === puzzle.solution[j] ? v : null));
    const forced = deduceClosure(puzzle.clues, known, 2)[i];
    if (forced === null) {
      setErrors((e) => e + 1);
      setMarkError("Not enough to convict. A suspect can only be judged once the revealed clues force their verdict with 100% certainty — keep deducing.");
      return;
    }
    if (status !== forced) {
      setErrors((e) => e + 1);
      setMarkError("That doesn't follow from the clues. Re-check your logic before judging.");
      return;
    }
    setMarkError(null);
    setSelected(null); // success: collapse the modal back to the board
    setDimmed((prev) => { if (!prev[i]) return prev; const n = prev.slice(); n[i] = false; return n; });
    setMarks((prev) => {
      if (prev[i] === status) return prev;
      const next = prev.slice();
      next[i] = status;
      if (next.every((v, idx) => v === puzzle.solution[idx])) {
        setSolved(true);
        setShowWin(true);
        onSolved();
      }
      return next;
    });
  }, [puzzle, marks, onSolved]);

  // "Clear" wipes a suspect's colour tag and dims their card to set it aside —
  // but never removes a correct verdict.
  const clearAnnotations = useCallback((i: number) => {
    setTags((prev) => { const n = prev.slice(); n[i] = 0; return n; });
    setDimmed((prev) => { const n = prev.slice(); n[i] = true; return n; });
  }, []);

  const cycleTag = useCallback((i: number) => {
    setTags((prev) => {
      const next = prev.slice();
      next[i] = (next[i] + 1) % (TAG_COUNT + 1);
      return next;
    });
    setDimmed((prev) => { if (!prev[i]) return prev; const n = prev.slice(); n[i] = false; return n; });
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
              dimmed={dimmed[s.id]}
              onOpen={() => { setMarkError(null); setSelected(s.id); }}
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

      <Glossary />

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
            explainText={explainClue(puzzle.clues[selected], puzzle.suspects)}
            dimmed={dimmed[selected]}
            note={notes[selected] ?? ""}
            markError={markError}
            onMark={(st) => setMark(selected, st)}
            onClear={() => clearAnnotations(selected)}
            onNote={(text) => setNote(selected, text)}
            onClose={() => { setMarkError(null); setSelected(null); }}
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
