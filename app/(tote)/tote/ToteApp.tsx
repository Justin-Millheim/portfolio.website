"use client";

import { useEffect, useState } from "react";
import type { GroceryList, ToteRecipe, MealPlanEntry } from "@/lib/tote/types";
import { getStore, setActiveStore, useLocalStore, seedIfEmpty } from "@/lib/tote/storage";
import { getSupabase } from "@/lib/tote/supabase";
import { SupabaseStore, migrateGuestDataToCloud } from "@/lib/tote/supabase-store";
import { seedLists, seedRecipes } from "@/lib/tote/seed";
import AuthGate from "./components/AuthGate";
import SetPasswordScreen from "./components/SetPasswordScreen";
import TabBar, { type Tab } from "./components/TabBar";
import Lists from "./components/Lists";
import Recipes from "./components/Recipes";
import Plan from "./components/Plan";
import { useConfirm } from "./components/ConfirmProvider";

type Account = { mode: "guest" | "cloud"; email?: string };
const GUEST_FLAG = "tote.guest";

export default function ToteApp() {
  const [booting, setBooting] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [entered, setEntered] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  const [tab, setTab] = useState<Tab>("lists");
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [recipes, setRecipes] = useState<ToteRecipe[]>([]);
  const [plan, setPlan] = useState<MealPlanEntry[]>([]);

  const { confirm } = useConfirm();
  const userId = account?.mode === "cloud" ? "cloud" : "local";

  // ---- auth bootstrap ----
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

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setRecovery(true); setBooting(false); }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (typeof window !== "undefined") window.scrollTo(0, 0); }, [tab, entered]);

  async function refresh() {
    const store = getStore();
    const [l, r, p] = await Promise.all([store.listLists(), store.listRecipes(), store.listPlan()]);
    setLists(l); setRecipes(r); setPlan(p);
  }

  async function enterGuest() {
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.setItem(GUEST_FLAG, "1");
    seedIfEmpty(seedLists(), seedRecipes());
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

  function backToGate() { setEntered(false); setAccount(null); setTab("lists"); }

  async function handleSignOut() {
    const r = await confirm({ title: "Sign out?", message: "Your cloud data stays safe and will be here next time you sign in.", confirmLabel: "Sign out", cancelLabel: "Cancel" });
    if (r !== "confirm") return;
    await getSupabase()?.auth.signOut();
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_FLAG);
    backToGate();
  }

  // ---- mutations: write-through the active store, then refresh ----
  async function saveList(l: GroceryList) { await getStore().saveList(l); await refresh(); }
  async function removeList(id: string) { await getStore().removeList(id); await refresh(); }
  async function saveRecipe(r: ToteRecipe) { await getStore().saveRecipe(r); await refresh(); }
  async function removeRecipe(id: string) { await getStore().removeRecipe(id); await refresh(); }
  async function savePlanEntry(e: MealPlanEntry) { await getStore().savePlanEntry(e); await refresh(); }
  async function removePlanEntry(id: string) { await getStore().removePlanEntry(id); await refresh(); }

  function handleRecoveryDone() { setRecovery(false); enterCloud(); }

  if (booting) return null;
  if (recovery) return <SetPasswordScreen supabase={getSupabase()} onDone={handleRecoveryDone} />;
  if (!entered) return <AuthGate supabase={getSupabase()} onGuest={enterGuest} onSignedIn={() => enterCloud()} />;

  return (
    <>
      {tab === "lists" && (
        <Lists
          lists={lists}
          userId={userId}
          account={account}
          onSave={saveList}
          onRemove={removeList}
          onSignIn={backToGate}
          onSignOut={handleSignOut}
        />
      )}
      {tab === "recipes" && (
        <Recipes
          recipes={recipes}
          lists={lists}
          userId={userId}
          onSave={saveRecipe}
          onRemove={removeRecipe}
          onSaveList={saveList}
        />
      )}
      {tab === "plan" && (
        <Plan
          plan={plan}
          recipes={recipes}
          userId={userId}
          onSaveEntry={savePlanEntry}
          onRemoveEntry={removePlanEntry}
          onSaveList={saveList}
        />
      )}
      <TabBar active={tab} onChange={setTab} />
    </>
  );
}
