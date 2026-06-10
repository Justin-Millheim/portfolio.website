"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty, Puzzle } from "@/lib/clues/types";
import { generatePuzzle, dailySeed, dailyDifficulty, practiceSeed } from "@/lib/clues/generator";
import Game, { type GameState } from "./components/Game";
import Menu from "./components/Menu";
import HowTo from "./components/HowTo";

const SOLVED_KEY = "clues.solved.v2";
const CURRENT_KEY = "clues.current.v2";
const PAGE = 24;

type Screen = "menu" | "game";

interface PuzzleRef {
  kind: "daily" | "practice";
  difficulty: Difficulty;
  seed: number;
  number?: number;   // practice puzzle index
  dateKey?: string;  // daily date id
}

interface SolvedHistory {
  daily: string[];
  practice: Record<Difficulty, number[]>;
}

interface Current { ref: PuzzleRef; puzzle: Puzzle; initial: GameState | null; }

const emptyHistory = (): SolvedHistory => ({
  daily: [], practice: { easy: [], medium: [], hard: [], tricky: [] },
});

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const refKey = (r: PuzzleRef) => `${r.kind}:${r.difficulty}:${r.number ?? r.dateKey ?? r.seed}`;
const todayKey = () => String(dailySeed());

function dateLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function labelFor(ref: PuzzleRef): string {
  return ref.kind === "daily"
    ? `Daily · ${dateLabel()} · ${cap(ref.difficulty)}`
    : `Practice · ${cap(ref.difficulty)} · #${ref.number}`;
}

export default function CluesApp() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<SolvedHistory>(emptyHistory);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [showHowTo, setShowHowTo] = useState(false);
  const [busy, setBusy] = useState(false);
  const activeRef = useRef<PuzzleRef | null>(null);
  const booted = useRef(false);

  // ---- boot: restore history, then resume an in-progress game or show menu ----
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let hist = emptyHistory();
    try {
      const raw = window.localStorage.getItem(SOLVED_KEY);
      if (raw) hist = { ...emptyHistory(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    setHistory(hist);

    try {
      const raw = window.localStorage.getItem(CURRENT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { ref: PuzzleRef; state: GameState };
        const puzzle = generatePuzzle(saved.ref.seed, saved.ref.difficulty);
        activeRef.current = saved.ref;
        setCurrent({ ref: saved.ref, puzzle, initial: saved.state });
        setDifficulty(saved.ref.difficulty);
        setScreen("game");
        return;
      }
    } catch { /* ignore */ }

    const firstVisit = hist.daily.length === 0 &&
      Object.values(hist.practice).every((a) => a.length === 0);
    if (firstVisit) setShowHowTo(true);
  }, []);

  const persistHistory = (h: SolvedHistory) => {
    try { window.localStorage.setItem(SOLVED_KEY, JSON.stringify(h)); } catch { /* ignore */ }
  };

  const onChange = useCallback((state: GameState) => {
    if (!activeRef.current) return;
    try {
      window.localStorage.setItem(CURRENT_KEY, JSON.stringify({ ref: activeRef.current, state }));
    } catch { /* ignore */ }
  }, []);

  const onSolved = useCallback(() => {
    const ref = activeRef.current;
    if (!ref) return;
    setHistory((h) => {
      const next: SolvedHistory = {
        daily: [...h.daily],
        practice: { ...h.practice, [ref.difficulty]: [...h.practice[ref.difficulty]] },
      };
      if (ref.kind === "daily" && ref.dateKey && !next.daily.includes(ref.dateKey)) {
        next.daily.push(ref.dateKey);
      } else if (ref.kind === "practice" && ref.number && !next.practice[ref.difficulty].includes(ref.number)) {
        next.practice[ref.difficulty].push(ref.number);
      }
      persistHistory(next);
      return next;
    });
  }, []);

  const startGame = useCallback((ref: PuzzleRef, savedInitial: GameState | null) => {
    // Harder boards take a few hundred ms to strip down; show a beat of feedback
    // and defer the heavy synchronous generate so the tap never feels frozen.
    setBusy(true);
    setTimeout(() => {
      const puzzle = generatePuzzle(ref.seed, ref.difficulty);
      activeRef.current = ref;
      setCurrent({ ref, puzzle, initial: savedInitial });
      setScreen("game");
      setBusy(false);
    }, 30);
  }, []);

  const startDaily = useCallback(() => {
    const diff = dailyDifficulty();
    startGame({ kind: "daily", difficulty: diff, seed: dailySeed(), dateKey: todayKey() }, null);
  }, [startGame]);

  const startPractice = useCallback((diff: Difficulty, n: number) => {
    startGame({ kind: "practice", difficulty: diff, seed: practiceSeed(diff, n), number: n }, null);
  }, [startGame]);

  const handleNext = useCallback(() => {
    const ref = activeRef.current;
    if (ref?.kind === "practice" && ref.number) startPractice(ref.difficulty, ref.number + 1);
    else startPractice(ref?.difficulty ?? difficulty, Math.floor(Math.random() * 9000) + 1);
  }, [difficulty, startPractice]);

  const backToMenu = useCallback(() => setScreen("menu"), []);

  if (screen === "game" && current) {
    return (
      <>
        <Game
          key={refKey(current.ref)}
          puzzle={current.puzzle}
          label={labelFor(current.ref)}
          initial={current.initial}
          onChange={onChange}
          onSolved={onSolved}
          onBack={backToMenu}
          onNext={handleNext}
        />
        {showHowTo && <HowTo onClose={() => setShowHowTo(false)} />}
        {busy && <div className="cl-overlay"><div className="cl-busy cl-mono">Assembling the case…</div></div>}
      </>
    );
  }

  return (
    <>
      <Menu
        difficulty={difficulty}
        setDifficulty={(d) => { setDifficulty(d); setVisibleCount(PAGE); }}
        solvedNumbers={history.practice[difficulty]}
        dailyDone={history.daily.includes(todayKey())}
        dailyLabel={`${dateLabel()} · ${cap(dailyDifficulty())}`}
        visibleCount={visibleCount}
        onDaily={startDaily}
        onPractice={(n) => startPractice(difficulty, n)}
        onRandom={() => startPractice(difficulty, Math.floor(Math.random() * 9000) + 1)}
        onShowMore={() => setVisibleCount((c) => c + PAGE)}
        onHowTo={() => setShowHowTo(true)}
      />
      {showHowTo && <HowTo onClose={() => setShowHowTo(false)} />}
      {busy && <div className="cl-overlay"><div className="cl-busy cl-mono">Assembling the case…</div></div>}
    </>
  );
}
