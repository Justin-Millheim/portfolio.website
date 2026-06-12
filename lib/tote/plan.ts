import type { GroceryItem, MealSlot, RecipeLine, ToteRecipe } from "./types";
import { newId } from "./seed";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];
export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString()).
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// The 7 dates of the week (Sun–Sat) containing `from`, offset by `weekOffset`.
export function weekDates(from: Date, weekOffset = 0): string[] {
  const start = new Date(from);
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return ymd(d);
  });
}

export function dayLabel(s: string): { dow: string; date: string } {
  const d = parseYmd(s);
  return { dow: DAY_NAMES[d.getDay()], date: `${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

export function isToday(s: string): boolean {
  return s === ymd(new Date());
}

export function weekRangeLabel(dates: string[]): string {
  if (!dates.length) return "";
  const a = parseYmd(dates[0]);
  const b = parseYmd(dates[dates.length - 1]);
  const left = `${MONTHS[a.getMonth()]} ${a.getDate()}`;
  const right = a.getMonth() === b.getMonth() ? `${b.getDate()}` : `${MONTHS[b.getMonth()]} ${b.getDate()}`;
  return `${left} – ${right}`;
}

// ---- ingredient aggregation: recipes -> consolidated grocery items ----------
// The meal-plan payoff. Scales each recipe's lines to its planned servings,
// then merges lines with the same item + unit (summing numeric quantities) so
// "3 onions across 4 recipes" lands as one line. Lines without a number, or
// that share a name but not a unit, are kept separate (we never guess wrong).
interface Agg { item: string; unit: string; category: RecipeLine["category"]; qty: number | null; }

export function aggregateForPlan(
  recipes: { recipe: ToteRecipe; servings: number }[]
): GroceryItem[] {
  const byKey = new Map<string, Agg>();
  const order: string[] = [];

  for (const { recipe, servings } of recipes) {
    const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
    for (const ln of recipe.lines) {
      if (!ln.item.trim()) continue;
      const key = `${ln.item.trim().toLowerCase()}|${ln.unit.trim().toLowerCase()}`;
      const scaledQty = ln.quantity == null ? null : round2(ln.quantity * factor);
      const existing = byKey.get(key);
      if (existing) {
        if (existing.qty != null && scaledQty != null) existing.qty += scaledQty;
        else existing.qty = existing.qty ?? scaledQty; // keep a number if either has one
      } else {
        byKey.set(key, { item: ln.item.trim(), unit: ln.unit.trim(), category: ln.category, qty: scaledQty });
        order.push(key);
      }
    }
  }

  return order.map((key) => {
    const a = byKey.get(key) as Agg;
    const quantity = a.qty == null ? "" : `${trimNum(a.qty)}${a.unit ? " " + a.unit : ""}`.trim();
    return {
      id: newId("i"), name: a.item, quantity, category: a.category,
      checked: false, addedAt: new Date().toISOString(),
    };
  });
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function trimNum(n: number): string { return Number.isInteger(n) ? String(n) : String(round2(n)); }
