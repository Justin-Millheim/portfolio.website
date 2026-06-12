import type { Recipe, RecipeFilter, Tag } from "./types";
import { sameTag } from "./tags";
import { totalTime } from "./format";

// Does a recipe carry a given tag?
function hasTag(recipe: Recipe, tag: Tag): boolean {
  return recipe.tags.some((t) => sameTag(t, tag));
}

// Full-text haystack: title, description, ingredient items, instructions, tags.
// Built lazily per query; libraries here are small (a personal recipe box).
function haystack(recipe: Recipe): string {
  return [
    recipe.title,
    recipe.description ?? "",
    recipe.notes ?? "",
    recipe.ingredients.map((i) => `${i.item} ${i.prep ?? ""}`).join(" "),
    recipe.instructions.join(" "),
    recipe.tags.map((t) => t.name).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

// Apply the library filter: free-text AND every selected tag AND the time cap.
// Multi-select tags are ANDed so "chicken + soup" narrows, matching the PRD's
// multi-faceted filtering intent.
export function filterRecipes(recipes: Recipe[], filter: RecipeFilter): Recipe[] {
  const terms = filter.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return recipes.filter((r) => {
    if (filter.tags.length && !filter.tags.every((t) => hasTag(r, t))) return false;

    if (filter.maxTotalTime != null) {
      const tt = totalTime(r);
      if (tt == null || tt > filter.maxTotalTime) return false;
    }

    if (terms.length) {
      const hay = haystack(r);
      if (!terms.every((term) => hay.includes(term))) return false;
    }

    return true;
  });
}

export const EMPTY_FILTER: RecipeFilter = { query: "", tags: [], maxTotalTime: null };
