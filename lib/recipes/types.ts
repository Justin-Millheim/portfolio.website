// Domain types for the /recipes app ("Mise" — a personal recipe box).
// Kept backend-agnostic so the same shapes serialize to localStorage today
// and to Supabase/Postgres later (see lib/recipes/storage.ts), mirroring the
// /train app's design.

// The categorization engine (PRD §5): every recipe carries many tags, each
// belonging to a type. This is what lets "chicken pot pie" live under
// main course AND chicken AND pie simultaneously, and powers multi-facet
// filtering ("chicken + soup").
export type TagType = "course" | "ingredient" | "dish" | "cuisine" | "dietary";

export interface Tag {
  type: TagType;
  name: string; // display name, lowercased for matching (e.g. "chicken")
}

export type Difficulty = "easy" | "medium" | "hard";

// One structured ingredient line. Quantities live here (not baked into a
// free-text string) so serving-scaling and, later, grocery aggregation work.
//   quantity null  -> non-numeric ("to taste"); never scaled.
//   unit in a non-scalable set ("pinch", "dash") -> kept as-is when scaling.
export interface RecipeIngredient {
  id: string;
  quantity: number | null;
  unit: string;        // "cup", "tbsp", "g", "" (count), "to taste"
  item: string;        // "yellow onion"
  prep?: string;       // "finely diced"
}

export interface Recipe {
  id: string;
  userId: string;      // "local" until cloud auth is wired
  title: string;
  description?: string;
  sourceUrl?: string;  // captured on URL import (Phase 2) or pasted manually
  imagePath?: string;  // Phase 2 (local filesystem / storage)
  prepTime?: number;   // minutes
  cookTime?: number;   // minutes
  servings: number;    // the base servings the quantities are written for
  ingredients: RecipeIngredient[];
  instructions: string[]; // ordered steps
  tags: Tag[];
  difficulty?: Difficulty;
  rating?: number;     // 1-5, Phase 2 but modeled now
  notes?: string;
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
}

// Active filter state for the library view.
export interface RecipeFilter {
  query: string;       // free-text search
  tags: Tag[];         // AND across selected tags
  maxTotalTime: number | null; // minutes; null = no cap ("under 30 min")
}
