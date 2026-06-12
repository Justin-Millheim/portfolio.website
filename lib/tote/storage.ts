import type { GroceryList, ToteRecipe, MealPlanEntry } from "./types";

// Single interface every backend implements. The UI only ever talks to this, so
// the localStorage (guest) and Supabase (cloud) adapters are interchangeable —
// the same multi-user seam used by /train and /recipes.
export interface ToteStore {
  listLists(): Promise<GroceryList[]>;
  saveList(list: GroceryList): Promise<void>;
  removeList(id: string): Promise<void>;

  listRecipes(): Promise<ToteRecipe[]>;
  saveRecipe(recipe: ToteRecipe): Promise<void>;
  removeRecipe(id: string): Promise<void>;

  listPlan(): Promise<MealPlanEntry[]>;
  savePlanEntry(entry: MealPlanEntry): Promise<void>;
  removePlanEntry(id: string): Promise<void>;
}

const K_LISTS = "tote.lists.v1";
const K_RECIPES = "tote.recipes.v1";
const K_PLAN = "tote.plan.v1";
const SEEDED_KEY = "tote.seeded.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function write<T>(key: string, val: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

function upsert<T extends { id: string }>(key: string, item: T) {
  const all = read<T>(key);
  const idx = all.findIndex((x) => x.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  write(key, all);
}
function removeById<T extends { id: string }>(key: string, id: string) {
  write(key, read<T>(key).filter((x) => x.id !== id));
}

// On-device adapter. Zero backend, zero cost. Data lives in this browser.
export class LocalStore implements ToteStore {
  async listLists() { return read<GroceryList>(K_LISTS).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)); }
  async saveList(list: GroceryList) { upsert(K_LISTS, list); }
  async removeList(id: string) { removeById<GroceryList>(K_LISTS, id); }

  async listRecipes() { return read<ToteRecipe>(K_RECIPES).sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)); }
  async saveRecipe(recipe: ToteRecipe) { upsert(K_RECIPES, recipe); }
  async removeRecipe(id: string) { removeById<ToteRecipe>(K_RECIPES, id); }

  async listPlan() { return read<MealPlanEntry>(K_PLAN); }
  async savePlanEntry(entry: MealPlanEntry) { upsert(K_PLAN, entry); }
  async removePlanEntry(id: string) { removeById<MealPlanEntry>(K_PLAN, id); }
}

// Active store. Defaults to on-device; ToteApp swaps in a SupabaseStore after a
// successful sign-in, and back to LocalStore on guest/sign-out.
let _store: ToteStore = new LocalStore();
export function getStore(): ToteStore { return _store; }
export function setActiveStore(store: ToteStore): void { _store = store; }
export function useLocalStore(): void { _store = new LocalStore(); }

// Raw on-device reads, used to migrate guest data up to the cloud on first login.
export function readLocalLists(): GroceryList[] { return read<GroceryList>(K_LISTS); }
export function readLocalRecipes(): ToteRecipe[] { return read<ToteRecipe>(K_RECIPES); }
export function readLocalPlan(): MealPlanEntry[] { return read<MealPlanEntry>(K_PLAN); }

// First-run seed (guest only): drop in a starter list + a couple recipes so the
// app demonstrates aisle-sorting, the recipe→list bridge, and the planner
// instead of an empty shell. Runs once per device; never overwrites real data.
export function seedIfEmpty(lists: GroceryList[], recipes: ToteRecipe[]): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(SEEDED_KEY) === "1") return false;
  const has = read(K_LISTS).length || read(K_RECIPES).length || read(K_PLAN).length;
  if (!has) {
    write(K_LISTS, lists);
    write(K_RECIPES, recipes);
  }
  window.localStorage.setItem(SEEDED_KEY, "1");
  return !has;
}
