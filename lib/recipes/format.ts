import type { Recipe, RecipeIngredient } from "./types";
import { scaledQuantity } from "./scale";

// Total time = prep + cook, when either is set.
export function totalTime(recipe: Recipe): number | null {
  const p = recipe.prepTime ?? 0;
  const c = recipe.cookTime ?? 0;
  const t = p + c;
  return t > 0 ? t : null;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// One ingredient rendered as a line, scaled by `factor` (default 1 = original).
//   "1½ cups yellow onion, finely diced"
//   "Salt, to taste"
export function formatIngredient(ing: RecipeIngredient, factor = 1): string {
  const qty = scaledQuantity(ing, factor);
  const unit = ing.unit.trim();
  const lead = [qty, unit].filter(Boolean).join(" ");
  const main = [lead, ing.item.trim()].filter(Boolean).join(" ");
  return ing.prep ? `${main}, ${ing.prep}` : main;
}
