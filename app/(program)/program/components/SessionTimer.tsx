"use client";

import { formatClock } from "@/lib/program/format";
import type { Phase } from "@/lib/program/types";

const PHASE_LABEL: Record<Phase, string> = {
  warmup: "Warm Up",
  main: "Workout",
  cooldown: "Cool Down",
};

// Always-visible corner widget that ticks for the whole session while the
// prominent per-exercise timers run on the main screen.
export default function SessionTimer({ seconds, phase }: { seconds: number; phase: Phase }) {
  return (
    <div className="t-session-timer" role="timer" aria-label="Total session time">
      <span className="dot" />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span className="t-time">{formatClock(seconds)}</span>
        <span className="t-phase">{PHASE_LABEL[phase]}</span>
      </div>
    </div>
  );
}
