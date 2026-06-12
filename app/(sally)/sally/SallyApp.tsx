"use client";

import { useEffect, useState } from "react";
import type { Song, SongBundle } from "@/lib/sally/types";
import { getStore, setActiveStore, useLocalStore } from "@/lib/sally/store";
import { getSupabase } from "@/lib/sally/supabase";
import { SupabaseStore, migrateGuestDataToCloud } from "@/lib/sally/supabase-store";
import { emptySong, newId, nowIso } from "@/lib/sally/format";
import { pickOpener } from "@/lib/sally/brain/phases";
import Library from "./components/Library";
import WritingRoom from "./components/WritingRoom";
import AuthGate from "./components/AuthGate";
import SetPasswordScreen from "./components/SetPasswordScreen";
import { useConfirm } from "./components/ConfirmProvider";

type Account = { mode: "guest" | "cloud"; email?: string };
type View = { screen: "library" } | { screen: "room"; bundle: SongBundle };

const GUEST_FLAG = "sally.guest";

export default function SallyApp() {
  const [booting, setBooting] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [entered, setEntered] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [view, setView] = useState<View>({ screen: "library" });

  const { confirm, toast } = useConfirm();

  // ---- auth bootstrap: restore a cloud session, a remembered guest, or gate ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
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

  // Detect a password-reset link landing -> show the "set new password" screen.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setRecovery(true); setBooting(false); }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [view.screen, entered]);

  async function refresh() {
    setSongs(await getStore().listSongs());
  }

  async function enterGuest() {
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.setItem(GUEST_FLAG, "1");
    setAccount({ mode: "guest" });
    await refresh();
    setEntered(true);
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
    setAccount({ mode: "cloud", email: user.email ?? undefined });
    await refresh();
    setEntered(true);
  }

  function backToGate() {
    setEntered(false);
    setAccount(null);
    setView({ screen: "library" });
  }

  async function handleSignOut() {
    const r = await confirm({
      title: "Sign out?",
      message: "Your cloud songs stay safe and will be here next time you sign in.",
      confirmLabel: "Sign out", cancelLabel: "Cancel",
    });
    if (r !== "confirm") return;
    const sb = getSupabase();
    await sb?.auth.signOut();
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_FLAG);
    backToGate();
  }

  // ---- songs ----------------------------------------------------------------

  async function newSong() {
    const song = emptySong(newId());
    await getStore().saveSong(song);
    const opener = {
      id: newId(),
      songId: song.id,
      phase: 1 as const,
      role: "sally" as const,
      content: pickOpener(),
      createdAt: nowIso(),
    };
    await getStore().addMessage(opener);
    setView({ screen: "room", bundle: { song, outlines: [], drafts: [], suno: null, messages: [opener] } });
  }

  async function openSong(id: string) {
    const bundle = await getStore().getBundle(id);
    if (!bundle) { toast("Couldn't open that one — it may have been deleted."); await refresh(); return; }
    setView({ screen: "room", bundle });
  }

  async function exitRoom() {
    await refresh();
    setView({ screen: "library" });
  }

  async function handleArchive(song: Song) {
    const next = { ...song, status: song.status === "archived" ? ("in_progress" as const) : ("archived" as const), updatedAt: nowIso() };
    await getStore().saveSong(next);
    await refresh();
  }

  async function handleDelete(song: Song) {
    const r = await confirm({
      title: "Delete this song?",
      message: `“${song.title}” — every outline, draft version, and prompt goes with it. Archiving keeps it on the shelf instead.`,
      confirmLabel: "Delete it all", cancelLabel: "Cancel", danger: true,
    });
    if (r !== "confirm") return;
    await getStore().removeSong(song.id);
    await refresh();
  }

  function handleRecoveryDone() { setRecovery(false); enterCloud(); }

  if (booting) return null;
  if (recovery) return <SetPasswordScreen supabase={getSupabase()} onDone={handleRecoveryDone} />;
  if (!entered) {
    return <AuthGate supabase={getSupabase()} onGuest={enterGuest} onSignedIn={() => enterCloud()} />;
  }

  if (view.screen === "room") {
    return <WritingRoom key={view.bundle.song.id} initial={view.bundle} onExit={exitRoom} />;
  }

  return (
    <Library
      songs={songs}
      account={account}
      onOpen={openSong}
      onNew={newSong}
      onArchive={handleArchive}
      onDelete={handleDelete}
      onSignIn={backToGate}
      onSignOut={handleSignOut}
    />
  );
}
