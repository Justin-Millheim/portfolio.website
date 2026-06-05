"use client";

import { useEffect, useState } from "react";
import type {
  CheckIn as CheckInType, Exercise, ExerciseLog, PhaseTimes, RunnerSnapshot,
  WorkoutPlan, WorkoutSession,
} from "@/lib/train/types";
import { generatePlan, swapItem } from "@/lib/train/generator";
import { clearActive, getStore, loadActive, saveActive } from "@/lib/train/storage";
import IntentSetup, { type Intent } from "./components/IntentSetup";
import PlanPreview from "./components/PlanPreview";
import CheckIn from "./components/CheckIn";
import Runner from "./components/Runner";
import Summary from "./components/Summary";
import History from "./components/History";
import ExerciseModal from "./components/ExerciseModal";
import PreviousWorkoutsModal from "./components/PreviousWorkoutsModal";

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
  const [runnerInitial, setRunnerInitial] = useState<RunnerSnapshot | null>(null);
  const [runResult, setRunResult] = useState<{ logs: ExerciseLog[]; totalSeconds: number; phaseTimes: PhaseTimes } | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);
  const [showPrevModal, setShowPrevModal] = useState(false);

  const store = getStore();

  // Load history + auto-resume any in-progress workout exactly where it left off.
  useEffect(() => {
    store.list().then(setSessions);
    const active = loadActive();
    if (active?.plan && active.snapshot) {
      setPlan(active.plan);
      setPre(active.pre ?? null);
      setRunnerInitial(active.snapshot);
      setScreen("run");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    store.list().then(setSessions);
  }

  // ---- home ----
  function handleGenerate() {
    setRunnerInitial(null);
    setPlan(generatePlan({ ...intent }));
    setScreen("preview");
  }
  function handleRepeat(s: WorkoutSession) {
    setShowPrevModal(false);
    setRunnerInitial(null);
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
    const before = plan.items[index]?.exerciseId;
    const next = swapItem(plan, index);
    if (next.items[index]?.exerciseId === before) {
      alert("No similar alternative is available for that slot — try Reroll for a fresh plan.");
      return;
    }
    setPlan(next);
  }
  function handleApprove() {
    setRunnerInitial(null);
    setScreen("precheck");
  }

  // ---- check-ins / run ----
  function handlePre(c: CheckInType) {
    setPre(c);
    setScreen("run");
  }
  function handlePersist(snapshot: RunnerSnapshot) {
    if (!plan) return;
    saveActive({ plan, pre: pre ?? undefined, snapshot, savedAt: new Date().toISOString() });
  }
  function handleRunComplete(logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) {
    clearActive();
    setRunnerInitial(null);
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

  async function handleToggleFavorite(favorite: boolean) {
    if (!session) return;
    await store.setFavorite(session.id, favorite);
    setSession({ ...session, favorite });
    refresh();
  }

  function resetToHome() {
    setPlan(null);
    setPre(null);
    setRunResult(null);
    setRunnerInitial(null);
    setSession(null);
    setScreen("home");
  }

  function exitRun() {
    if (confirm("Exit this workout? Your progress so far won't be saved.")) {
      clearActive();
      resetToHome();
    }
  }

  return (
    <>
      {screen === "home" && (
        <IntentSetup
          value={intent}
          onChange={setIntent}
          onGenerate={handleGenerate}
          hasHistory={sessions.length > 0}
          onPrevious={() => setShowPrevModal(true)}
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
          key={plan.id}
          plan={plan}
          initial={runnerInitial}
          onComplete={handleRunComplete}
          onExit={exitRun}
          onOpenExercise={setModalExercise}
          onPersist={handlePersist}
        />
      )}

      {screen === "postcheck" && <CheckIn variant="post" onSubmit={handlePost} />}

      {screen === "summary" && session && (
        <Summary
          session={session}
          onDone={resetToHome}
          onHistory={() => setScreen("history")}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {screen === "history" && (
        <History
          sessions={sessions}
          onBack={() => setScreen(session ? "summary" : "home")}
          onDelete={async (id) => { await store.remove(id); refresh(); }}
        />
      )}

      {showPrevModal && (
        <PreviousWorkoutsModal
          sessions={sessions}
          onStart={handleRepeat}
          onClose={() => setShowPrevModal(false)}
        />
      )}

      {modalExercise && (
        <ExerciseModal exercise={modalExercise} onClose={() => setModalExercise(null)} />
      )}
    </>
  );
}
