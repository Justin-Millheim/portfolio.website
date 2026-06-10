"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Puzzle, Status } from "@/lib/clues/types";
import { generatePuzzle, dailySeed } from "@/lib/clues/generator";
import { renderClue } from "@/lib/clues/clues";
import { nextDeduction } from "@/lib/clues/solver";
import { SIZE } from "@/lib/clues/grid";
import SuspectCard, { type HintRole } from "./components/SuspectCard";
import WinOverlay from "./components/WinOverlay";
import HowTo from "./components/HowTo";

const SAVE_KEY = "clues.v1";
const TAG_COUNT = 4; // colour tags beyond "none"

interface Hint {
  level: 0 | 1 | 2;
  by: number;        // clue index doing the forcing
  speaker: number;
  region: number[];
  target: number;
  status: Status;
}

interface SavedState {
  seed: number;
  marks: (Status | null)[];
  tags: number[];
  hintsUsed: number;
  errors: number;
  startedAt: number;
}

function freshMarks(puzzle: Puzzle): (Status | null)[] {
  const marks = new Array(SIZE).fill(null) as (Status | null)[];
  marks[puzzle.start] = puzzle.solution[puzzle.start]; // the free reveal
  return marks;
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function CluesApp() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [marks, setMarks] = useState<(Status | null)[]>([]);
  const [tags, setTags] = useState<number[]>(() => new Array(SIZE).fill(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const booted = useRef(false);

  // ---- load a saved game, or open today's puzzle on first ever visit ----
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let saved: SavedState | null = null;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(SAVE_KEY) : null;
      if (raw) saved = JSON.parse(raw) as SavedState;
    } catch {
      saved = null;
    }
    if (saved) {
      const p = generatePuzzle(saved.seed);
      setPuzzle(p);
      setMarks(saved.marks);
      setTags(saved.tags?.length === SIZE ? saved.tags : new Array(SIZE).fill(0));
      setHintsUsed(saved.hintsUsed ?? 0);
      setErrors(saved.errors ?? 0);
      setStartedAt(saved.startedAt ?? Date.now());
      setSolved(p.solution.every((v, i) => saved!.marks[i] === v));
    } else {
      startPuzzle(dailySeed());
      setShowHowTo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- persist after every change ----
  useEffect(() => {
    if (!puzzle) return;
    const state: SavedState = { seed: puzzle.seed, marks, tags, hintsUsed, errors, startedAt };
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [puzzle, marks, tags, hintsUsed, errors, startedAt]);

  // ---- running clock, frozen once solved ----
  useEffect(() => {
    if (solved) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [solved, puzzle]);

  function startPuzzle(seed: number) {
    const p = generatePuzzle(seed);
    setPuzzle(p);
    setMarks(freshMarks(p));
    setTags(new Array(SIZE).fill(0));
    setSelected(null);
    setHint(null);
    setHintsUsed(0);
    setErrors(0);
    setStartedAt(Date.now());
    setNow(Date.now());
    setSolved(false);
    setShowWin(false);
  }

  const newCase = useCallback(() => {
    // a fresh random board (the daily seed is the same for everyone all day)
    startPuzzle((Math.floor(Math.random() * 1_000_000) + Date.now()) >>> 0);
  }, []);

  const setMark = useCallback((i: number, status: Status) => {
    if (!puzzle || i === puzzle.start) return;
    setHint(null);
    setMarks((prev) => {
      if (prev[i] === status) return prev;
      const next = prev.slice();
      next[i] = status;
      // count a misstep only when landing on a wrong verdict
      if (status !== puzzle.solution[i] && prev[i] !== status) {
        setErrors((e) => e + 1);
      }
      if (next.every((v, idx) => v === puzzle.solution[idx])) {
        setSolved(true);
        setShowWin(true);
        setSelected(null);
      }
      return next;
    });
  }, [puzzle]);

  const clearMark = useCallback((i: number) => {
    if (!puzzle || i === puzzle.start) return;
    setMarks((prev) => {
      if (prev[i] === null) return prev;
      const next = prev.slice();
      next[i] = null;
      return next;
    });
  }, [puzzle]);

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
    if (!puzzle) return;
    if (hint && hint.level === 1) { setHint({ ...hint, level: 2 }); return; }
    const known = marks.map((v, i) => (v === puzzle.solution[i] ? v : null));
    const step = nextDeduction(puzzle.clues, known);
    if (!step) return; // nothing left to force (already solved or only errors remain)
    const clue = puzzle.clues[step.by];
    const region = clue.kind === "count" ? clue.region : [clue.speaker];
    setHint({ level: 1, by: step.by, speaker: clue.speaker, region, target: step.index, status: step.status });
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

  if (!puzzle) {
    return (
      <div className="cl-wrap">
        <div className="cl-loading">Assembling the line-up…</div>
      </div>
    );
  }

  const isDaily = puzzle.seed === dailySeed();

  return (
    <div className="cl-wrap">
      <div className="cl-glow cl-glow-tr" />
      <div className="cl-glow cl-glow-bl" />

      <header className="cl-head">
        <div className="cl-kicker">{isDaily ? "Daily case" : "Practice case"}</div>
        <h1 className="cl-title">Clues</h1>
        <p className="cl-tag">Label all twenty. Pure logic, never a guess.</p>
      </header>

      <div className="cl-statusbar">
        <span className="cl-mono">{labelled}/{SIZE} labelled</span>
        <span className="cl-mono cl-clock">{fmtTime(now - startedAt)}</span>
        <button className="cl-link" onClick={() => setShowHowTo(true)}>How to play</button>
      </div>

      <div className="cl-grid">
        {puzzle.suspects.map((s) => {
          const m = marks[s.id];
          // a clue only unlocks on a correct identification (or the free reveal)
          const revealed = s.id === puzzle.start || m === puzzle.solution[s.id];
          return (
            <SuspectCard
              key={s.id}
              name={s.name}
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
        <button className="cl-btn cl-btn-ghost" onClick={newCase}>New case</button>
      </div>

      {hint && (
        <p className="cl-hint-note">
          {hint.level === 1
            ? "Read the highlighted clue — it pins down one more suspect."
            : `You can now identify ${puzzle.suspects[hint.target].name}.`}
        </p>
      )}

      {showHowTo && <HowTo onClose={() => setShowHowTo(false)} />}
      {showWin && solved && (
        <WinOverlay
          timeLabel={fmtTime(now - startedAt)}
          hintsUsed={hintsUsed}
          errors={errors}
          onNew={newCase}
          onClose={() => setShowWin(false)}
        />
      )}
    </div>
  );
}
