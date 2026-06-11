"use client";

import { useEffect, useState } from "react";
import type {
  CheckIn as CheckInType, Exercise, ExerciseLog, PhaseTimes, RunnerSnapshot,
  WorkoutPlan, WorkoutSession,
} from "@/lib/train/types";
import { generatePlan, planItemFor, swapItem } from "@/lib/train/generator";
import {
  applyToggleBlocked, applyTogglePreferred, clearActive, getStore, loadActive,
  saveActive, setActiveStore, useLocalStore, type ExercisePrefs,
} from "@/lib/train/storage";
import { getSupabase } from "@/lib/train/supabase";
import { SupabaseStore, migrateGuestDataToCloud } from "@/lib/train/supabase-store";
import IntentSetup, { type Intent } from "./components/IntentSetup";
import PlanPreview from "./components/PlanPreview";
import CheckIn from "./components/CheckIn";
import Runner from "./components/Runner";
import Summary from "./components/Summary";
import History from "./components/History";
import ExerciseModal from "./components/ExerciseModal";
import PreviousWorkoutsModal from "./components/PreviousWorkoutsModal";
import AddExerciseModal from "./components/AddExerciseModal";
import AuthGate from "./components/AuthGate";
import { useConfirm } from "./components/ConfirmProvider";

type Screen = "home" | "preview" | "precheck" | "run" | "postcheck" | "summary" | "history";
type Account = { mode: "guest" | "cloud"; email?: string };

const DEFAULT_INTENT: Intent = {
  focus: "full", minutes: 20, equipment: "full", constraints: [], difficulty: "beginner",
};
const GUEST_FLAG = "train.guest";

export default function TrainApp() {
  const [entered, setEntered] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [prefs, setPrefs] = useState<ExercisePrefs>({ preferred: [], blocked: [] });

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
  const [showAddModal, setShowAddModal] = useState(false);
  const { confirm, toast } = useConfirm();

  // ---- auth bootstrap: restore a cloud session, a remembered guest, or show the gate ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (data.session?.user && !cancelled) { await enterCloud(); return; }
      }
      if (!cancelled && typeof window !== "undefined" && window.localStorage.getItem(GUEST_FLAG) === "1") {
        await enterGuest();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishEnter(acct: Account) {
    const store = getStore();
    const [list, p] = await Promise.all([store.list(), store.getPrefs()]);
    setSessions(list);
    setPrefs(p);
    const active = loadActive();
    if (active?.plan && active.snapshot) {
      setPlan(active.plan);
      setPre(active.pre ?? null);
      setRunnerInitial(active.snapshot);
      setScreen("run");
    }
    setAccount(acct);
    setEntered(true);
  }

  async function enterGuest() {
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.setItem(GUEST_FLAG, "1");
    await finishEnter({ mode: "guest" });
  }

  async function enterCloud() {
    const sb = getSupabase();
    if (!sb) { await enterGuest(); return; }
    const { data } = await sb.auth.getUser();
    const user = data.user;
    if (!user) { await enterGuest(); return; }
    setActiveStore(new SupabaseStore(sb, user.id));
    try { await migrateGuestDataToCloud(getStore()); } catch (e) { console.error(e); }
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_FLAG);
    await finishEnter({ mode: "cloud", email: user.email ?? undefined });
  }

  // Each "screen" is a client-side swap, so the browser keeps the previous
  // scroll position. Approving a long plan (or any step-to-step move) would
  // otherwise drop you partway down the next screen, past its intro prompt.
  // Snap back to the top on every transition so each step starts where it reads.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [screen, entered]);

  function refresh() { getStore().list().then(setSessions); }

  // ---- account ----
  function backToGate() {
    setEntered(false);
    setAccount(null);
    resetToHome();
  }
  async function handleSignOut() {
    const r = await confirm({ title: "Sign out?", message: "Your cloud history stays safe and will be here next time you sign in.", confirmLabel: "Sign out", cancelLabel: "Cancel" });
    if (r !== "confirm") return;
    const sb = getSupabase();
    await sb?.auth.signOut();
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_FLAG);
    backToGate();
  }

  // ---- preferences (sync through the active store) ----
  function persistPrefs(next: ExercisePrefs) {
    setPrefs(next);
    getStore().savePrefs(next).catch(console.error);
  }
  const onTogglePreferred = (id: string) => persistPrefs(applyTogglePreferred(prefs, id));
  const onToggleBlocked = (id: string) => persistPrefs(applyToggleBlocked(prefs, id));

  // ---- home ----
  function handleGenerate() {
    setRunnerInitial(null);
    setPlan(generatePlan({ ...intent, preferred: prefs.preferred, blocked: prefs.blocked }));
    setScreen("preview");
  }
  function handleRepeat(s: WorkoutSession) {
    setShowPrevModal(false);
    setRunnerInitial(null);
    setIntent({
      focus: s.focus, minutes: s.durationTarget, equipment: s.equipment,
      constraints: s.constraints, difficulty: s.plan.difficulty,
    });
    setPlan({ ...s.plan, id: `plan_repeat_${Date.now()}`, createdAt: new Date().toISOString() });
    setScreen("preview");
  }

  // ---- preview ----
  function handleReroll() {
    if (!plan) return;
    setPlan(generatePlan({ ...intent, seed: Math.floor(Math.random() * 1e9), preferred: prefs.preferred, blocked: prefs.blocked }));
  }
  function handleSwap(index: number) {
    if (!plan) return;
    const before = plan.items[index]?.exerciseId;
    const next = swapItem(plan, index, prefs.blocked);
    if (next.items[index]?.exerciseId === before) {
      toast("No similar alternative for that slot — try Reroll.");
      return;
    }
    setPlan(next);
  }
  function handleAddExercise(exerciseId: string) {
    if (!plan) return;
    const newItem = planItemFor(exerciseId, "circuit");
    if (!newItem) return;
    const items = [...plan.items];
    let idx = items.map((i) => i.phase).lastIndexOf("circuit");
    if (idx === -1) {
      const cd = items.findIndex((i) => i.phase === "cooldown");
      idx = cd === -1 ? items.length - 1 : cd - 1;
    }
    items.splice(idx + 1, 0, newItem);
    setPlan({ ...plan, items });
    setShowAddModal(false);
  }
  function handleApprove() { setRunnerInitial(null); setScreen("precheck"); }

  // ---- check-ins / run ----
  function handlePre(c: CheckInType) { setPre(c); setScreen("run"); }
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
      userId: account?.mode === "cloud" ? "cloud" : "local",
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
    await getStore().save(finished);
    setSession(finished);
    refresh();
    setScreen("summary");
  }

  async function handleToggleFavorite(favorite: boolean) {
    if (!session) return;
    await getStore().setFavorite(session.id, favorite);
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

  // Exiting mid-workout builds a summary from what was done (unfinished moves
  // marked skipped) and optionally saves it; the confirm itself lives in Runner.
  function handleExit(mode: "save" | "discard", logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) {
    clearActive();
    setRunnerInitial(null);
    if (!plan) { resetToHome(); return; }
    const now = new Date().toISOString();
    const sess: WorkoutSession = {
      id: `w_${Date.now()}`,
      userId: account?.mode === "cloud" ? "cloud" : "local",
      date: now,
      focus: plan.focus,
      durationTarget: plan.durationTarget,
      equipment: plan.equipment,
      constraints: plan.constraints,
      status: mode === "save" ? "completed" : "abandoned",
      plan,
      pre: pre ?? undefined,
      logs,
      totalSeconds,
      phaseTimes,
      completedAt: now,
    };
    if (mode === "save") getStore().save(sess).then(refresh).catch(console.error);
    setRunResult(null);
    setSession(sess);
    setScreen("summary");
  }

  if (!entered) {
    return <AuthGate supabase={getSupabase()} onGuest={enterGuest} onSignedIn={() => enterCloud()} />;
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
          account={account}
          onSignIn={backToGate}
          onSignOut={handleSignOut}
        />
      )}

      {screen === "preview" && plan && (
        <PlanPreview
          plan={plan}
          onApprove={handleApprove}
          onReroll={handleReroll}
          onSwap={handleSwap}
          onOpenExercise={setModalExercise}
          onAddExercise={() => setShowAddModal(true)}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "precheck" && <CheckIn variant="pre" onSubmit={handlePre} />}

      {screen === "run" && plan && (
        <Runner
          key={plan.id}
          plan={plan}
          initial={runnerInitial}
          prefs={prefs}
          onComplete={handleRunComplete}
          onExit={handleExit}
          onOpenExercise={setModalExercise}
          onPersist={handlePersist}
          onTogglePreferred={onTogglePreferred}
          onToggleBlocked={onToggleBlocked}
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
          onDelete={async (id) => {
            const r = await confirm({ title: "Delete this workout?", message: "This permanently removes it from your history.", confirmLabel: "Delete", cancelLabel: "Cancel", danger: true });
            if (r === "confirm") { await getStore().remove(id); refresh(); }
          }}
        />
      )}

      {showPrevModal && (
        <PreviousWorkoutsModal
          sessions={sessions}
          onStart={handleRepeat}
          onClose={() => setShowPrevModal(false)}
        />
      )}

      {showAddModal && plan && (
        <AddExerciseModal
          plan={plan}
          onAdd={handleAddExercise}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {modalExercise && (
        <ExerciseModal exercise={modalExercise} onClose={() => setModalExercise(null)} />
      )}
    </>
  );
}
