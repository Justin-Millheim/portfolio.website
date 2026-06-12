import { CATALOG_ITEMS } from "./catalog";

const UNIT_WORDS = new Set([
  "lb", "lbs", "oz", "g", "kg", "cup", "cups", "tbsp", "tsp", "qt", "gal", "gallon",
  "pint", "pt", "ct", "count", "pack", "packs", "box", "boxes", "can", "cans", "jar",
  "jars", "bag", "bags", "bunch", "dozen", "loaf", "bottle", "bottles", "container",
  "lb.", "oz.", "pkg",
]);

export interface ParsedAdd {
  quantity: string; // "2 lb", "3", ""
  name: string;     // "chicken breast"
}

// Pull a leading quantity (and optional unit) off a quick-add string, AnyList
// style: "2 lb chicken breast" -> { quantity: "2 lb", name: "chicken breast" };
// "milk" -> { quantity: "", name: "milk" }; "3 bananas" -> { "3", "bananas" }.
export function parseQuickAdd(raw: string): ParsedAdd {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { quantity: "", name: "" };

  const tokens = text.split(" ");
  const qtyTokens: string[] = [];

  // Leading number (incl. fractions/decimals like "1", "1.5", "1/2", "1 1/2").
  if (/^\d+([./]\d+)?$/.test(tokens[0])) {
    qtyTokens.push(tokens.shift() as string);
    // optional "1/2" continuation already covered; allow a second fraction token
    if (tokens[0] && /^\d+\/\d+$/.test(tokens[0])) qtyTokens.push(tokens.shift() as string);
    // optional unit word right after the number
    if (tokens[0] && UNIT_WORDS.has(tokens[0].toLowerCase())) qtyTokens.push(tokens.shift() as string);
  }

  const name = tokens.join(" ").trim();
  // If stripping the quantity left no name (e.g. user typed just "2"), keep it
  // as the name so nothing is silently lost.
  if (!name) return { quantity: "", name: text };
  return { quantity: qtyTokens.join(" "), name };
}

// Autocomplete: rank catalog + the user's own recent item names against the
// current name fragment. Prefix matches rank above substring matches; recents
// are boosted so your own vocabulary surfaces first.
export function suggestItems(fragment: string, recents: string[], limit = 6): string[] {
  const f = fragment.trim().toLowerCase();
  if (!f) return recents.slice(0, limit);

  const seen = new Set<string>();
  const prefix: string[] = [];
  const substr: string[] = [];

  const pool = [...recents.map((r) => r.toLowerCase()), ...CATALOG_ITEMS];
  for (const item of pool) {
    if (seen.has(item)) continue;
    if (item === f) { seen.add(item); continue; }
    if (item.startsWith(f)) { prefix.push(item); seen.add(item); }
    else if (item.includes(f)) { substr.push(item); seen.add(item); }
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...substr].slice(0, limit);
}
