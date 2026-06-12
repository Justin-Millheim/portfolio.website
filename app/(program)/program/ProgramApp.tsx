"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CheckIn as CheckInType, Exercise, ExerciseLog, PhaseTimes, ProgramPrefs, ProgramProgress,
  RunnableSession, RunnerSnapshot, SessionLog,
} from "@/lib/program/types";
import { buildSession, markComplete, nextSession, restartBlock, applySubstitution, clearSubstitution } from "@/lib/program/program-engine";
import { getDay } from "@/lib/program/program";
import {
  clearActive, EMPTY_PREFS, getStore, loadActive, saveActive, setActiveStore, useLocalStore,
} from "@/lib/program/storage";
import { getSupabase } from "@/lib/program/supabase";
import { SupabaseStore, migrateGuestDataToCloud } from "@/lib/program/supabase-store";
import Home from "./components/Home";
import BlockMap from "./components/BlockMap";
import PlanPreview from "./components/PlanPreview";
import Day4Menu from "./components/Day4Menu";
import CheckIn from "./components/CheckIn";
import Runner from "./components/Runner";
import Summary from "./components/Summary";
import Progress from "./components/Progress";
import History from "./components/History";
import ExerciseModal from "./components/ExerciseModal";
import SubstitutionSheet from "./components/SubstitutionSheet";
import AuthGate from "./components/AuthGate";
import Onboarding from "./components/Onboarding";
import SetPasswordScreen from "./components/SetPasswordScreen";
import { useConfirm } from "./components/ConfirmProvider";

type Screen = "home" | "block" | "preview" | "day4" | "precheck" | "run" | "postcheck" | "summary" | "progress" | "history";
type Account = { mode: "guest" | "cloud"; email?: string };
type Selected = { week: 1 | 2 | 3 | 4; day: 1 | 2 | 3 | 4; optionId?: string };

const GUEST_FLAG = "program.guest";
const ONBOARDED_FLAG = "program.onboarded.v1";

export default function ProgramApp() {
  const [entered, setEntered] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [prefs, setPrefs] = useState<ProgramPrefs>({ ...EMPTY_PREFS });
  const [progress, setProgress] = useState<ProgramProgress | null>(null);

  const [booting, setBooting] = useState(true);
  const [onboarded, setOnboarded] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [pendingResume, setPendingResume] = useState<ReturnType<typeof loadActive>>(null);
  const resumeAskedRef = useRef(false);

  const [screen, setScreen] = useState<Screen>("home");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [runnable, setRunnable] = useState<RunnableSession | null>(null);
  const [pre, setPre] = useState<CheckInType | null>(null);
  const [runnerInitial, setRunnerInitial] = useState<RunnerSnapshot | null>(null);
  const [runResult, setRunResult] = useState<{ logs: ExerciseLog[]; totalSeconds: number; phaseTimes: PhaseTimes } | null>(null);
  const [session, setSession] = useState<SessionLog | null>(null);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);
  const [subSheetFor, setSubSheetFor] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const { confirm } = useConfirm();

  // ---- auth bootstrap ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window !== "undefined") {
        setOnboarded(window.localStorage.getItem(ONBOARDED_FLAG) === "1");
      }
      const guest = typeof window !== "undefined" && window.localStorage.getItem(GUEST_FLAG) === "1";
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (data.session?.user && !cancelled) await enterCloud();
        else if (guest && !cancelled) await enterGuest();
      } else if (guest && !cancelled) {
        await enterGuest();
      }
      if (!cancelled) setBooting(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register the PWA service worker (scoped strictly to /program). Enables
  // add-to-home-screen install + offline launch. No-op where unsupported.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/program/sw.js", { scope: "/program" }).catch(() => {});
  }, []);

  // Password-reset link landing.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setRecovery(true); setBooting(false); }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Offer to resume an interrupted session.
  useEffect(() => {
    if (!entered || !pendingResume || resumeAskedRef.current) return;
    resumeAskedRef.current = true;
    (async () => {
      const s = pendingResume;
      const day = getDay(s.session.day);
      const r = await confirm({
        title: "Resume your session?",
        message: `You have Week ${s.session.week}, Day ${s.session.day} — ${day?.title ?? ""} in progress on this device.`,
        confirmLabel: "Resume",
        altLabel: "Discard it",
        cancelLabel: "Not now",
      });
      if (r === "confirm") handleResume();
      else if (r === "alt") handleDiscardResume();
      else setPendingResume(null);
      resumeAskedRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, pendingResume]);

  async function finishEnter(acct: Account) {
    const store = getStore();
    const [list, p, prog] = await Promise.all([store.listSessions(), store.getPrefs(), store.getProgress()]);
    setSessions(list);
    setPrefs(p);
    setProgress(prog);
    const active = loadActive();
    if (active?.session && active.snapshot) setPendingResume(active);
    setAccount(acct);
    setEntered(true);
  }

  function handleResume() {
    if (!pendingResume) return;
    setRunnable(pendingResume.session);
    setPre(pendingResume.pre ?? null);
    setRunnerInitial(pendingResume.snapshot);
    setSelected({ week: pendingResume.session.week, day: pendingResume.session.day, optionId: pendingResume.session.optionId });
    setPendingResume(null);
    setScreen("run");
  }
  function handleDiscardResume() {
    clearActive();
    setPendingResume(null);
  }

  function handleOnboarded() {
    if (typeof window !== "undefined") window.localStorage.setItem(ONBOARDED_FLAG, "1");
    setOnboarded(true);
  }
  function handleRecoveryDone() { setRecovery(false); enterCloud(); }

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

  // Snap to top on every screen change.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [screen, entered]);

  function refresh() { getStore().listSessions().then(setSessions); }

  // ---- account ----
  function backToGate() {
    setEntered(false);
    setAccount(null);
    resetToHome();
  }
  async function handleSignOut() {
    const r = await confirm({ title: "Sign out?", message: "Your cloud progress stays safe and will be here next time you sign in.", confirmLabel: "Sign out", cancelLabel: "Cancel" });
    if (r !== "confirm") return;
    const sb = getSupabase();
    await sb?.auth.signOut();
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_FLAG);
    backToGate();
  }

  // ---- prefs ----
  function persistPrefs(next: ProgramPrefs) {
    setPrefs(next);
    getStore().savePrefs(next).catch(console.error);
    return next;
  }

  // ---- starting a session ----
  function startDay(week: 1 | 2 | 3 | 4, day: 1 | 2 | 3 | 4) {
    if (!progress) return;
    setRunnerInitial(null);
    if (day === 4) {
      setSelected({ week, day: 4 });
      setScreen("day4");
      return;
    }
    const rs = buildSession(week, day, prefs, progress);
    setRunnable(rs);
    setSelected({ week, day });
    setScreen("preview");
  }

  function startCircuit(optionId: string) {
    if (!progress || !selected) return;
    const rs = buildSession(selected.week, 4, prefs, progress, optionId);
    setRunnable(rs);
    setSelected({ ...selected, optionId });
    setRunnerInitial(null);
    setScreen("preview");
  }

  function handleSubChoose(exerciseId: string, subId: string | null) {
    const next = persistPrefs(subId ? applySubstitution(exerciseId, subId, prefs) : clearSubstitution(exerciseId, prefs));
    // Rebuild the preview with the new choice applied.
    if (progress && selected) {
      setRunnable(buildSession(selected.week, selected.day, next, progress, selected.optionId));
    }
  }

  function handleApprove() {
    startedAtRef.current = new Date().toISOString();
    setRunnerInitial(null);
    setScreen("precheck");
  }

  function handlePre(c: CheckInType) { setPre(c); setScreen("run"); }

  function handlePersist(snapshot: RunnerSnapshot) {
    if (!runnable) return;
    saveActive({ session: runnable, pre: pre ?? undefined, snapshot, savedAt: new Date().toISOString() });
  }

  function handleRunComplete(logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) {
    clearActive();
    setRunnerInitial(null);
    setRunResult({ logs, totalSeconds, phaseTimes });
    setScreen("postcheck");
  }

  function commitSession(sess: SessionLog, countComplete: boolean) {
    getStore().saveSession(sess).catch(console.error);
    setSessions((prev) => [sess, ...prev.filter((s) => s.id !== sess.id)]);
    if (countComplete && progress) {
      const np = markComplete(progress, sess.week, sess.day);
      setProgress(np);
      getStore().saveProgress(np).catch(console.error);
    }
  }

  async function handlePost(post: CheckInType) {
    if (!runnable || !runResult || !selected || !progress) return;
    const now = new Date().toISOString();
    const sess: SessionLog = {
      id: `p_${Date.now()}`,
      userId: account?.mode === "cloud" ? "cloud" : "local",
      block: progress.blockNumber,
      week: selected.week, day: selected.day, optionId: selected.optionId,
      date: now, startedAt: startedAtRef.current, finishedAt: now,
      status: "completed",
      pre: pre ?? undefined, post,
      exercises: runResult.logs,
      totalSeconds: runResult.totalSeconds,
      phaseTimes: runResult.phaseTimes,
    };
    commitSession(sess, true);
    setSession(sess);
    setRunResult(null);
    setScreen("summary");
  }

  // Day-4 free option (swim/bike/treadmill): one-screen logger, counts toward completion.
  function handleLogFree(optionId: string, durationSec: number, note?: string) {
    if (!selected || !progress) return;
    const now = new Date().toISOString();
    const sess: SessionLog = {
      id: `p_${Date.now()}`,
      userId: account?.mode === "cloud" ? "cloud" : "local",
      block: progress.blockNumber,
      week: selected.week, day: 4, optionId,
      date: now, startedAt: now, finishedAt: now,
      status: "completed",
      exercises: note ? [{ exerciseId: optionId, phase: "main", sets: [], skipped: false, note }] : [],
      totalSeconds: durationSec,
      phaseTimes: { warmup: 0, main: durationSec, cooldown: 0 },
    };
    commitSession(sess, true);
    setSession(sess);
    setScreen("summary");
  }

  // Exit mid-session: save & summarize (counts) or discard (doesn't).
  function handleExit(mode: "save" | "discard", logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) {
    clearActive();
    setRunnerInitial(null);
    if (!runnable || !selected || !progress) { resetToHome(); return; }
    const now = new Date().toISOString();
    const sess: SessionLog = {
      id: `p_${Date.now()}`,
      userId: account?.mode === "cloud" ? "cloud" : "local",
      block: progress.blockNumber,
      week: selected.week, day: selected.day, optionId: selected.optionId,
      date: now, startedAt: startedAtRef.current, finishedAt: now,
      status: mode === "save" ? "completed" : "abandoned",
      pre: pre ?? undefined,
      exercises: logs,
      totalSeconds, phaseTimes,
    };
    if (mode === "save") commitSession(sess, true);
    setRunResult(null);
    setSession(sess);
    setScreen("summary");
  }

  async function handleToggleFavorite(favorite: boolean) {
    if (!session) return;
    await getStore().setFavorite(session.id, favorite);
    setSession({ ...session, favorite });
    refresh();
  }

  function handleRestartBlock() {
    if (!progress) return;
    const np = restartBlock(progress);
    setProgress(np);
    getStore().saveProgress(np).catch(console.error);
  }

  function resetToHome() {
    setRunnable(null);
    setPre(null);
    setRunResult(null);
    setRunnerInitial(null);
    setSession(null);
    setSelected(null);
    setScreen("home");
  }

  if (booting) return null;
  if (recovery) return <SetPasswordScreen supabase={getSupabase()} onDone={handleRecoveryDone} />;
  if (!onboarded) return <Onboarding onDone={handleOnboarded} />;
  if (!entered) return <AuthGate supabase={getSupabase()} onGuest={enterGuest} onSignedIn={() => enterCloud()} />;
  if (!progress) return null;

  const up = nextSession(progress);

  return (
    <>
      {screen === "home" && (
        <Home
          progress={progress}
          account={account}
          coachLine={coachLine(up, progress, sessions)}
          upNext={up}
          onStart={(w, d) => startDay(w as 1 | 2 | 3 | 4, d as 1 | 2 | 3 | 4)}
          onOpenBlock={() => setScreen("block")}
          onOpenProgress={() => setScreen("progress")}
          onOpenHistory={() => setScreen("history")}
          onRestartBlock={handleRestartBlock}
          onSignIn={backToGate}
          onSignOut={handleSignOut}
          hasHistory={sessions.length > 0}
        />
      )}

      {screen === "block" && (
        <BlockMap
          progress={progress}
          onPick={(w, d) => startDay(w, d)}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "day4" && selected && (
        <Day4Menu
          week={selected.week}
          onStartCircuit={startCircuit}
          onLogFree={handleLogFree}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "preview" && runnable && (
        <PlanPreview
          session={runnable}
          sessions={sessions}
          prefs={prefs}
          onApprove={handleApprove}
          onBack={() => setScreen(selected?.day === 4 ? "day4" : "home")}
          onOpenExercise={setModalExercise}
          onSwap={(exerciseId) => setSubSheetFor(exerciseId)}
        />
      )}

      {screen === "precheck" && <CheckIn variant="pre" onSubmit={handlePre} />}

      {screen === "run" && runnable && (
        <Runner
          key={`${runnable.week}-${runnable.day}-${runnable.optionId ?? ""}`}
          session={runnable}
          initial={runnerInitial}
          onComplete={handleRunComplete}
          onExit={handleExit}
          onOpenExercise={setModalExercise}
          onPersist={handlePersist}
        />
      )}

      {screen === "postcheck" && <CheckIn variant="post" onSubmit={handlePost} />}

      {screen === "summary" && session && (
        <Summary
          session={session}
          sessions={sessions}
          onDone={resetToHome}
          onHistory={() => setScreen("history")}
          onProgress={() => setScreen("progress")}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {screen === "progress" && (
        <Progress sessions={sessions} onBack={() => setScreen(session ? "summary" : "home")} />
      )}

      {screen === "history" && (
        <History
          sessions={sessions}
          onBack={() => setScreen(session ? "summary" : "home")}
          onDelete={async (id) => {
            const r = await confirm({ title: "Delete this session?", message: "This permanently removes it from your history.", confirmLabel: "Delete", cancelLabel: "Cancel", danger: true });
            if (r === "confirm") { await getStore().removeSession(id); refresh(); }
          }}
        />
      )}

      {modalExercise && (
        <ExerciseModal exercise={modalExercise} onClose={() => setModalExercise(null)} />
      )}

      {subSheetFor && (
        <SubstitutionSheet
          exerciseId={subSheetFor}
          currentSubId={prefs.subs[subSheetFor]}
          onChoose={(subId) => handleSubChoose(subSheetFor, subId)}
          onClose={() => setSubSheetFor(null)}
        />
      )}
    </>
  );
}

// Light, personal, progression-aware coach lines.
function coachLine(
  up: { week: number; day: number } | null,
  progress: ProgramProgress,
  sessions: SessionLog[],
): string {
  if (!up) return "Block done — 16 for 16. Start a fresh one when you're ready. 🔥";
  const day = getDay(up.day);
  const title = day?.title ?? "";
  if (sessions.length === 0) return `Week 1, Day 1 — ${title}. Let's lay the foundation.`;
  if (up.day === 4) return `Week ${up.week}, Day 4. Pick your conditioning and go move.`;
  if (up.week === 1) return `Week 1, Day ${up.day} — ${title}. Set your baselines today.`;
  if (up.week === 4) return `Week ${up.week}, Day ${up.day} — ${title}. Final week. Leave it all here.`;
  return `Week ${up.week}, Day ${up.day} — ${title}. Same lifts, a little heavier. Let's go.`;
}
