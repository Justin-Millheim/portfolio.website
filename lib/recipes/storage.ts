import type { Recipe } from "./types";

// Single interface every backend implements. The UI only ever talks to this,
// so the localStorage (guest) and Supabase (cloud) adapters are interchangeable
// — exactly the seam that lets /train (and now /recipes) go multi-user without
// a rewrite.
export interface RecipeStore {
  list(): Promise<Recipe[]>;
  get(id: string): Promise<Recipe | null>;
  save(recipe: Recipe): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "recipes.box.v1";
const SEEDED_KEY = "recipes.seeded.v1";

function readAll(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Recipe[]) : [];
  } catch {
    return [];
  }
}

function writeAll(recipes: Recipe[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(recipes));
}

// On-device adapter. Zero backend, zero cost. Data lives in this browser.
export class LocalStore implements RecipeStore {
  async list(): Promise<Recipe[]> {
    return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }
  async get(id: string): Promise<Recipe | null> {
    return readAll().find((r) => r.id === id) ?? null;
  }
  async save(recipe: Recipe): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((r) => r.id === recipe.id);
    if (idx >= 0) all[idx] = recipe;
    else all.push(recipe);
    writeAll(all);
  }
  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((r) => r.id !== id));
  }
}

// Active store. Defaults to on-device; RecipesApp swaps in a SupabaseStore after
// a successful sign-in, and back to LocalStore on guest/sign-out.
let _store: RecipeStore = new LocalStore();
export function getStore(): RecipeStore {
  return _store;
}
export function setActiveStore(store: RecipeStore): void {
  _store = store;
}
export function useLocalStore(): void {
  _store = new LocalStore();
}

// Raw on-device read, used to migrate guest data up to the cloud on first login.
export function readLocalRecipes(): Recipe[] {
  return readAll();
}

// ---- first-run seed (guest only) -------------------------------------------
// Seed a couple of recipes the first time someone lands as a guest so the
// library demonstrates browse / filter / scale instead of an empty shell.
// Runs once per device; never overwrites real data.
export function seedIfEmpty(seed: Recipe[]): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(SEEDED_KEY) === "1") return false;
  if (readAll().length > 0) {
    window.localStorage.setItem(SEEDED_KEY, "1");
    return false;
  }
  writeAll(seed);
  window.localStorage.setItem(SEEDED_KEY, "1");
  return true;
}

// JSON export/import so an on-device box can be backed up or moved between
// devices until cloud sync is live (mirrors /train).
export function exportRecipes(): string {
  return JSON.stringify(readAll(), null, 2);
}
export function importRecipes(json: string): number {
  const incoming = JSON.parse(json) as Recipe[];
  if (!Array.isArray(incoming)) throw new Error("Invalid backup file");
  const all = readAll();
  const byId = new Map(all.map((r) => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  writeAll([...byId.values()]);
  return incoming.length;
}
