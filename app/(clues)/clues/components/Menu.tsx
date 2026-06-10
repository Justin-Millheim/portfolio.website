"use client";

import type { Difficulty } from "@/lib/clues/types";

const TIERS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "tricky", label: "Tricky" },
];

interface Props {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  solvedNumbers: number[];      // solved practice #s for the active difficulty
  dailyDone: boolean;
  dailyLabel: string;
  visibleCount: number;
  onDaily: () => void;
  onPractice: (n: number) => void;
  onRandom: () => void;
  onShowMore: () => void;
  onHowTo: () => void;
}

export default function Menu({
  difficulty, setDifficulty, solvedNumbers, dailyDone, dailyLabel,
  visibleCount, onDaily, onPractice, onRandom, onShowMore, onHowTo,
}: Props) {
  const solved = new Set(solvedNumbers);
  return (
    <div className="cl-wrap">
      <div className="cl-glow cl-glow-tr" />
      <div className="cl-glow cl-glow-bl" />

      <header className="cl-head">
        <div className="cl-kicker">Deduction puzzles</div>
        <h1 className="cl-title">Clues</h1>
        <p className="cl-tag">Label all twenty. Pure logic, never a guess.</p>
      </header>

      <button className="cl-daily" onClick={onDaily}>
        <div>
          <div className="cl-daily-k">Daily case{dailyDone ? " · solved" : ""}</div>
          <div className="cl-daily-l">{dailyLabel}</div>
        </div>
        <span className="cl-daily-go">{dailyDone ? "Replay ›" : "Play ›"}</span>
      </button>

      <div className="cl-section">
        <span className="cl-section-h cl-mono">Practice</span>
        <button className="cl-link" onClick={onHowTo}>How to play</button>
      </div>

      <div className="cl-tabs">
        {TIERS.map((t) => (
          <button
            key={t.id}
            className={`cl-tab ${difficulty === t.id ? "is-on" : ""}`}
            onClick={() => setDifficulty(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="cl-pgrid">
        {Array.from({ length: visibleCount }, (_, k) => k + 1).map((n) => (
          <button
            key={n}
            className={`cl-pnum ${solved.has(n) ? "is-solved" : ""}`}
            onClick={() => onPractice(n)}
          >
            {n}
            {solved.has(n) && <span className="cl-check" aria-hidden>✓</span>}
          </button>
        ))}
      </div>

      <div className="cl-controls">
        <button className="cl-btn cl-btn-ghost" onClick={onShowMore}>Show more</button>
        <button className="cl-btn cl-btn-primary" onClick={onRandom}>Random case</button>
      </div>
    </div>
  );
}
