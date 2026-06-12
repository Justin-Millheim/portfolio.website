import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeStore } from "./storage";
import { readLocalRecipes } from "./storage";
import type { Recipe } from "./types";

// Cloud adapter. Stores each recipe as a row in `recipes` (full recipe in a
// jsonb `data` column, plus queryable title/updated_at), mirroring the /train
// design. Row-Level Security (see supabase/recipes_schema.sql) guarantees a
// user can only ever read/write their own rows.
export class SupabaseStore implements RecipeStore {
  constructor(private sb: SupabaseClient, private userId: string) {}

  async list(): Promise<Recipe[]> {
    const { data, error } = await this.sb
      .from("recipes")
      .select("data")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });
    if (error) { console.error("[recipes] list", error.message); return []; }
    return (data ?? []).map((r) => r.data as Recipe);
  }

  async get(id: string): Promise<Recipe | null> {
    const { data, error } = await this.sb
      .from("recipes")
      .select("data")
      .eq("user_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    if (error) { console.error("[recipes] get", error.message); return null; }
    return (data?.data as Recipe) ?? null;
  }

  async save(recipe: Recipe): Promise<void> {
    const { error } = await this.sb.from("recipes").upsert({
      id: recipe.id,
      user_id: this.userId,
      title: recipe.title,
      updated_at: recipe.updatedAt,
      data: { ...recipe, userId: this.userId },
    });
    if (error) console.error("[recipes] save", error.message);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.sb.from("recipes").delete().eq("user_id", this.userId).eq("id", id);
    if (error) console.error("[recipes] remove", error.message);
  }
}

// One-time lift of on-device (guest) recipes into the cloud on first sign-in.
// Safe to run repeatedly: recipes upsert by id, and existing ones are skipped.
export async function migrateGuestDataToCloud(store: RecipeStore): Promise<number> {
  let migrated = 0;
  const local = readLocalRecipes();
  if (local.length) {
    const existing = await store.list();
    const ids = new Set(existing.map((r) => r.id));
    for (const r of local) {
      if (!ids.has(r.id)) { await store.save(r); migrated += 1; }
    }
  }
  return migrated;
}
