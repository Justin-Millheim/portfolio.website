import type { Recipe, RecipeIngredient } from "./types";

// Units that don't scale sensibly — "1 pinch" x2 isn't "2 pinches" worth
// caring about, and "to taste" has no quantity at all. Per the PRD's scaling
// edge-case note, these pass through untouched.
const NON_SCALABLE_UNITS = new Set([
  "to taste", "pinch", "dash", "handful", "sprinkle", "splash", "as needed", "garnish",
]);

export function isScalable(ing: RecipeIngredient): boolean {
  if (ing.quantity == null) return false;
  return !NON_SCALABLE_UNITS.has(ing.unit.trim().toLowerCase());
}

// Common cooking fractions, in eighths/thirds, for human-friendly display.
const FRACTIONS: [number, string][] = [
  [0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.375, "⅜"],
  [0.5, "½"], [0.625, "⅝"], [2 / 3, "⅔"], [0.75, "¾"], [0.875, "⅞"], [1, ""],
];

// Turn a raw number into a tidy cooking quantity: "2", "1½", "¾", "0.4" -> "⅜".
// Whole numbers stay whole; otherwise snap the fractional part to the nearest
// common fraction so scaled amounts read like a recipe, not a calculator.
export function formatQuantity(n: number): string {
  if (!isFinite(n)) return "";
  if (n === 0) return "0";
  const whole = Math.floor(n);
  const frac = n - whole;

  // Find the nearest common fraction to the leftover.
  let best = FRACTIONS[0];
  let bestDist = Infinity;
  for (const f of FRACTIONS) {
    const d = Math.abs(frac - f[0]);
    if (d < bestDist) { bestDist = d; best = f; }
  }

  // If the snap is poor (e.g. 0.4), fall back to a trimmed decimal so we never
  // misreport an amount as a clean fraction it isn't.
  if (bestDist > 0.06) {
    return trimDecimal(n);
  }

  const [fracVal, glyph] = best;
  if (fracVal === 1) return String(whole + 1);          // rounded up to next whole
  if (glyph === "") return String(whole);                // rounded down to whole
  return whole > 0 ? `${whole}${glyph}` : glyph;
}

function trimDecimal(n: number): string {
  return String(Math.round(n * 100) / 100);
}

// The scale factor for a target serving count against the recipe's base.
export function scaleFactor(recipe: Recipe, targetServings: number): number {
  const base = recipe.servings > 0 ? recipe.servings : 1;
  return targetServings / base;
}

// Scaled, display-ready quantity string for one ingredient at a given factor.
// Non-scalable lines return their original quantity (or "" when quantity-less).
export function scaledQuantity(ing: RecipeIngredient, factor: number): string {
  if (ing.quantity == null) return "";
  if (!isScalable(ing)) return formatQuantity(ing.quantity);
  return formatQuantity(ing.quantity * factor);
}

// Parse the quantity field from the editor: "1 1/2", "1/2", "1.5", "2" -> number;
// "to taste" / blank -> null. Forgiving so manual entry stays effortless (a goal).
export function parseQuantity(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const [, w, a, b] = mixed;
    const denom = Number(b);
    return denom ? Number(w) + Number(a) / denom : Number(w);
  }
  // Pure fraction: "3/4"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const denom = Number(frac[2]);
    return denom ? Number(frac[1]) / denom : null;
  }
  // Unicode single-glyph fractions, optionally with a leading whole ("1½")
  const glyphs: Record<string, number> = {
    "⅛": 0.125, "¼": 0.25, "⅓": 1 / 3, "⅜": 0.375, "½": 0.5,
    "⅝": 0.625, "⅔": 2 / 3, "¾": 0.75, "⅞": 0.875,
  };
  const uni = s.match(/^(\d*)\s*([⅛¼⅓⅜½⅝⅔¾⅞])$/);
  if (uni) {
    const whole = uni[1] ? Number(uni[1]) : 0;
    return whole + (glyphs[uni[2]] ?? 0);
  }
  const num = Number(s);
  return isFinite(num) ? num : null;
}
