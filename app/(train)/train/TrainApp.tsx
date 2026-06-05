"use client";

import { useEffect, useState } from "react";
import type {
  CheckIn as CheckInType, Exercise, ExerciseLog, PhaseTimes, WorkoutPlan, WorkoutSession,
} from "@/lib/train/types";
import { generatePlan, swapItem } from "@/lib/train/generator";
import { getStore } from "@/lib/train/storage";
import IntentSetup, { type Intent } from "./components/IntentSetup";
import PlanPreview from "./components/PlanPreview";
import CheckIn from "./components/CheckIn";
import Runner from "./components/Runner";
import Summary from "./components/Summary";
import History from "./components/History";
import ExerciseModal from "./components/ExerciseModal";

type Screen = "home" | "preview" | "precheck" | "run" | "postcheck" | "summary" | "history";

const DEFAULT_INTENT: Intent = {
  focus: "full",
  minutes: 20,
  equipment: "full",
  constraints: [],
  difficulty: "beginner",
};

export default function TrainApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [intent, setIntent] = useState<Intent>(DEFAULT_INTENT);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [pre, setPre] = useState<CheckInType | null>(null);
  const [runResult, setRunResult] = useState<{ logs: ExerciseLog[]; totalSeconds: number; phaseTimes: PhaseTimes } | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  const store = getStore();

  useEffect(() => {
    store.list().then(setSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    store.list().then(setSessions);
  }

  // ---- home ----
  function handleGenerate() {
    setPlan(generatePlan({ ...intent }));
    setScreen("preview");
  }
  function handleRepeat(s: WorkoutSession) {
    setIntent({
      focus: s.focus,
      minutes: s.durationTarget,
      equipment: s.equipment,
      constraints: s.constraints,
      difficulty: s.plan.difficulty,
    });
    setPlan({ ...s.plan, id: `plan_repeat_${Date.now()}`, createdAt: new Date().toISOString() });
    setScreen("preview");
  }

  // ---- preview ----
  function handleReroll() {
    if (!plan) return;
    setPlan(generatePlan({ ...intent, seed: Math.floor(Math.random() * 1e9) }));
  }
  function handleSwap(index: number) {
    if (!plan) return;
    setPlan(swapItem(plan, index));
  }
  function handleApprove() {
    setScreen("precheck");
  }

  // ---- check-ins / run ----
  function handlePre(c: CheckInType) {
    setPre(c);
    setScreen("run");
  }
  function handleRunComplete(logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) {
    setRunResult({ logs, totalSeconds, phaseTimes });
    setScreen("postcheck");
  }
  async function handlePost(post: CheckInType) {
    if (!plan || !runResult) return;
    const now = new Date().toISOString();
    const finished: WorkoutSession = {
      id: `w_${Date.now()}`,
      userId: "local",
      date: now,
      focus: plan.focus,
      durationTarget: plan.durationTarget,
      equipment: plan.equipment,
      constraints: plan.constraints,
      status: "completed",
      plan,
      pre: pre ?? undefined,
      post,
      logs: runResult.logs,
      totalSeconds: runResult.totalSeconds,
      phaseTimes: runResult.phaseTimes,
      completedAt: now,
    };
    await store.save(finished);
    setSession(finished);
    refresh();
    setScreen("summary");
  }

  function resetToHome() {
    setPlan(null);
    setPre(null);
    setRunResult(null);
    setSession(null);
    setScreen("home");
  }

  function exitRun() {
    if (confirm("Exit this workout? Progress won't be saved.")) resetToHome();
  }

  return (
    <>
      {screen === "home" && (
        <IntentSetup
          value={intent}
          onChange={setIntent}
          onGenerate={handleGenerate}
          recent={sessions}
          onRepeat={handleRepeat}
          onHistory={() => setScreen("history")}
        />
      )}

      {screen === "preview" && plan && (
        <PlanPreview
          plan={plan}
          onApprove={handleApprove}
          onReroll={handleReroll}
          onSwap={handleSwap}
          onOpenExercise={setModalExercise}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "precheck" && <CheckIn variant="pre" onSubmit={handlePre} />}

      {screen === "run" && plan && (
        <Runner
          plan={plan}
          onComplete={handleRunComplete}
          onExit={exitRun}
          onOpenExercise={setModalExercise}
        />
      )}

      {screen === "postcheck" && <CheckIn variant="post" onSubmit={handlePost} />}

      {screen === "summary" && session && (
        <Summary session={session} onDone={resetToHome} onHistory={() => setScreen("history")} />
      )}

      {screen === "history" && (
        <History
          sessions={sessions}
          onBack={() => setScreen(session ? "summary" : "home")}
          onDelete={async (id) => { await store.remove(id); refresh(); }}
          onImported={refresh}
        />
      )}

      {modalExercise && (
        <ExerciseModal exercise={modalExercise} onClose={() => setModalExercise(null)} />
      )}
    </>
  );
}
