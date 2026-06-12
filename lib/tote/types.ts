// Domain types for /tote — a rudimentary AnyList: smart grocery lists, light
// recipes, and a weekly meal plan. Backend-agnostic so the same shapes
// serialize to localStorage (guest) and Supabase (cloud), exactly like /train.

// Store sections / aisles. Ordered roughly the way you walk a store so a
// list sorted by category reads top-to-bottom as a shopping route.
export type Category =
  | "produce"
  | "meat"
  | "dairy"
  | "bakery"
  | "deli"
  | "frozen"
  | "pantry"
  | "baking"
  | "condiments"
  | "snacks"
  | "beverages"
  | "breakfast"
  | "household"
  | "personal"
  | "other";

export interface GroceryItem {
  id: string;
  name: string;        // "chicken breast"
  quantity: string;    // free text: "2 lb", "3", "" — kept as text, AnyList-style
  category: Category;  // auto-assigned, user-overridable
  checked: boolean;
  note?: string;
  addedAt: string;     // ISO — for the "recently added" sort
}

export type ListSort = "aisle" | "alpha" | "added";

export interface GroceryList {
  id: string;
  userId: string;
  name: string;
  items: GroceryItem[];
  sort: ListSort;
  createdAt: string;
  updatedAt: string;
}

// Lightweight recipe — just enough to feed lists and the meal plan. (Mise is
// the richer recipe box; Tote's recipes are list-oriented on purpose.)
export interface RecipeLine {
  id: string;
  quantity: number | null; // numeric so it can scale + aggregate; null = "to taste"
  unit: string;            // "cup", "lb", "" (count)
  item: string;            // "yellow onion"
  category: Category;      // auto-assigned for the list it feeds
}

export interface ToteRecipe {
  id: string;
  userId: string;
  name: string;
  servings: number;
  lines: RecipeLine[];
  steps: string[];
  note?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type MealSlot = "breakfast" | "lunch" | "dinner";

// One assignment on the weekly plan. Either references a saved recipe or holds
// a free-text idea ("leftovers", "pizza out").
export interface MealPlanEntry {
  id: string;
  userId: string;
  date: string;        // YYYY-MM-DD
  slot: MealSlot;
  recipeId?: string;
  text?: string;       // free-text alternative to a recipe
  servings?: number;   // override; defaults to the recipe's servings
}
