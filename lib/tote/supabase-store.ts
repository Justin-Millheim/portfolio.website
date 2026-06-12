import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToteStore } from "./storage";
import { readLocalLists, readLocalRecipes, readLocalPlan } from "./storage";
import type { GroceryList, ToteRecipe, MealPlanEntry } from "./types";

// Cloud adapter. Each entity is one row with the full object in a jsonb `data`
// column (plus queryable keys), mirroring /train and /recipes. Row-Level
// Security (see supabase/tote_schema.sql) guarantees a user can only ever
// read/write their own rows.
export class SupabaseStore implements ToteStore {
  constructor(private sb: SupabaseClient, private userId: string) {}

  // ---- grocery lists ----
  async listLists(): Promise<GroceryList[]> {
    const { data, error } = await this.sb
      .from("tote_lists").select("data").eq("user_id", this.userId)
      .order("created_at", { ascending: true });
    if (error) { console.error("[tote] listLists", error.message); return []; }
    return (data ?? []).map((r) => r.data as GroceryList);
  }
  async saveList(list: GroceryList): Promise<void> {
    const { error } = await this.sb.from("tote_lists").upsert({
      id: list.id, user_id: this.userId, name: list.name,
      created_at: list.createdAt, updated_at: list.updatedAt,
      data: { ...list, userId: this.userId },
    });
    if (error) console.error("[tote] saveList", error.message);
  }
  async removeList(id: string): Promise<void> {
    const { error } = await this.sb.from("tote_lists").delete().eq("user_id", this.userId).eq("id", id);
    if (error) console.error("[tote] removeList", error.message);
  }

  // ---- recipes ----
  async listRecipes(): Promise<ToteRecipe[]> {
    const { data, error } = await this.sb
      .from("tote_recipes").select("data").eq("user_id", this.userId)
      .order("name", { ascending: true });
    if (error) { console.error("[tote] listRecipes", error.message); return []; }
    return (data ?? []).map((r) => r.data as ToteRecipe);
  }
  async saveRecipe(recipe: ToteRecipe): Promise<void> {
    const { error } = await this.sb.from("tote_recipes").upsert({
      id: recipe.id, user_id: this.userId, name: recipe.name,
      updated_at: recipe.updatedAt, data: { ...recipe, userId: this.userId },
    });
    if (error) console.error("[tote] saveRecipe", error.message);
  }
  async removeRecipe(id: string): Promise<void> {
    const { error } = await this.sb.from("tote_recipes").delete().eq("user_id", this.userId).eq("id", id);
    if (error) console.error("[tote] removeRecipe", error.message);
  }

  // ---- meal plan ----
  async listPlan(): Promise<MealPlanEntry[]> {
    const { data, error } = await this.sb
      .from("tote_plan").select("data").eq("user_id", this.userId);
    if (error) { console.error("[tote] listPlan", error.message); return []; }
    return (data ?? []).map((r) => r.data as MealPlanEntry);
  }
  async savePlanEntry(entry: MealPlanEntry): Promise<void> {
    const { error } = await this.sb.from("tote_plan").upsert({
      id: entry.id, user_id: this.userId, date: entry.date, slot: entry.slot,
      data: { ...entry, userId: this.userId },
    });
    if (error) console.error("[tote] savePlanEntry", error.message);
  }
  async removePlanEntry(id: string): Promise<void> {
    const { error } = await this.sb.from("tote_plan").delete().eq("user_id", this.userId).eq("id", id);
    if (error) console.error("[tote] removePlanEntry", error.message);
  }
}

// One-time lift of on-device (guest) data into the cloud on first sign-in.
// Safe to run repeatedly: everything upserts by id, existing ids are skipped.
export async function migrateGuestDataToCloud(store: ToteStore): Promise<number> {
  let migrated = 0;

  const [lists, recipes, plan] = await Promise.all([store.listLists(), store.listRecipes(), store.listPlan()]);
  const listIds = new Set(lists.map((x) => x.id));
  const recipeIds = new Set(recipes.map((x) => x.id));
  const planIds = new Set(plan.map((x) => x.id));

  for (const l of readLocalLists()) if (!listIds.has(l.id)) { await store.saveList(l); migrated++; }
  for (const r of readLocalRecipes()) if (!recipeIds.has(r.id)) { await store.saveRecipe(r); migrated++; }
  for (const e of readLocalPlan()) if (!planIds.has(e.id)) { await store.savePlanEntry(e); migrated++; }

  return migrated;
}
