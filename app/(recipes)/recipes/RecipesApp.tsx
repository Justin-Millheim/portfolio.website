"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "@/lib/recipes/types";
import {
  getStore, setActiveStore, useLocalStore, seedIfEmpty,
} from "@/lib/recipes/storage";
import { getSupabase } from "@/lib/recipes/supabase";
import { SupabaseStore, migrateGuestDataToCloud } from "@/lib/recipes/supabase-store";
import { seedRecipes, emptyRecipe } from "@/lib/recipes/seed";
import Library from "./components/Library";
import RecipeDetail from "./components/RecipeDetail";
import RecipeForm from "./components/RecipeForm";
import AuthGate from "./components/AuthGate";
import SetPasswordScreen from "./components/SetPasswordScreen";
import { useConfirm } from "./components/ConfirmProvider";

type Screen = "library" | "detail" | "form";
type Account = { mode: "guest" | "cloud"; email?: string };

const GUEST_FLAG = "recipes.guest";

export default function RecipesApp() {
  const [booting, setBooting] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [entered, setEntered] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [screen, setScreen] = useState<Screen>("library");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { confirm } = useConfirm();

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

  // Snap to top on every screen transition.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [screen, entered]);

  async function refresh() {
    setRecipes(await getStore().list());
  }

  async function enterGuest() {
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.setItem(GUEST_FLAG, "1");
    seedIfEmpty(seedRecipes()); // first-run demo content, on-device only
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
    setScreen("library");
    setActiveId(null);
  }

  async function handleSignOut() {
    const r = await confirm({
      title: "Sign out?",
      message: "Your cloud recipes stay safe and will be here next time you sign in.",
      confirmLabel: "Sign out", cancelLabel: "Cancel",
    });
    if (r !== "confirm") return;
    const sb = getSupabase();
    await sb?.auth.signOut();
    useLocalStore();
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_FLAG);
    backToGate();
  }

  // ---- navigation ----
  function openRecipe(id: string) { setActiveId(id); setScreen("detail"); }
  function startNew() {
    setDraft(emptyRecipe(account?.mode === "cloud" ? "cloud" : "local"));
    setIsNew(true);
    setScreen("form");
  }
  function startEdit(recipe: Recipe) {
    setDraft(recipe);
    setIsNew(false);
    setScreen("form");
  }

  async function handleSave(recipe: Recipe) {
    await getStore().save(recipe);
    await refresh();
    setActiveId(recipe.id);
    setDraft(null);
    setScreen("detail");
  }

  async function handleDelete(recipe: Recipe) {
    const r = await confirm({
      title: "Delete this recipe?",
      message: `“${recipe.title || "Untitled recipe"}” will be permanently removed.`,
      confirmLabel: "Delete", cancelLabel: "Cancel", danger: true,
    });
    if (r !== "confirm") return;
    await getStore().remove(recipe.id);
    await refresh();
    setActiveId(null);
    setScreen("library");
  }

  function handleRecoveryDone() { setRecovery(false); enterCloud(); }

  if (booting) return null;
  if (recovery) return <SetPasswordScreen supabase={getSupabase()} onDone={handleRecoveryDone} />;
  if (!entered) {
    return <AuthGate supabase={getSupabase()} onGuest={enterGuest} onSignedIn={() => enterCloud()} />;
  }

  const active = recipes.find((r) => r.id === activeId) ?? null;

  if (screen === "form" && draft) {
    return (
      <RecipeForm
        initial={draft}
        isNew={isNew}
        onSave={handleSave}
        onCancel={() => setScreen(active && !isNew ? "detail" : "library")}
      />
    );
  }

  if (screen === "detail" && active) {
    return (
      <RecipeDetail
        recipe={active}
        onBack={() => { setScreen("library"); setActiveId(null); }}
        onEdit={() => startEdit(active)}
        onDelete={() => handleDelete(active)}
      />
    );
  }

  return (
    <Library
      recipes={recipes}
      onOpen={openRecipe}
      onNew={startNew}
      account={account}
      onSignIn={backToGate}
      onSignOut={handleSignOut}
    />
  );
}
