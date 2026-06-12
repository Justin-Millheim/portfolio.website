import type { Tag, TagType } from "./types";

// The tag-type vocabulary from PRD §5. Order here is the order shown in the UI.
export const TAG_TYPES: TagType[] = ["course", "ingredient", "dish", "cuisine", "dietary"];

export const TAG_TYPE_LABEL: Record<TagType, string> = {
  course: "Course",
  ingredient: "Main ingredient",
  dish: "Dish type",
  cuisine: "Cuisine",
  dietary: "Dietary",
};

// Starter suggestions per type. The system is trivially extensible — users can
// type any new tag in the form and it just works; these only seed the picker.
export const TAG_PRESETS: Record<TagType, string[]> = {
  course: ["breakfast", "appetizer", "main", "side", "dessert", "snack"],
  ingredient: ["chicken", "beef", "pork", "seafood", "vegetarian", "pasta", "eggs"],
  dish: ["soup", "salad", "pie", "casserole", "stir-fry", "sandwich", "bowl", "bake"],
  cuisine: ["italian", "mexican", "thai", "indian", "american", "mediterranean", "chinese"],
  dietary: ["gluten-free", "vegan", "vegetarian", "dairy-free", "low-carb", "nut-free"],
};

// Normalize for matching/dedupe — tags are case-insensitive on name + type.
export function normalizeTag(t: Tag): Tag {
  return { type: t.type, name: t.name.trim().toLowerCase() };
}

export function tagKey(t: Tag): string {
  return `${t.type}:${t.name.trim().toLowerCase()}`;
}

export function sameTag(a: Tag, b: Tag): boolean {
  return tagKey(a) === tagKey(b);
}

// Build the deduped set of tags actually in use across a library, grouped by
// type — the source for the browse/filter chips.
export function collectTags(recipes: { tags: Tag[] }[]): Record<TagType, string[]> {
  const sets: Record<TagType, Set<string>> = {
    course: new Set(), ingredient: new Set(), dish: new Set(), cuisine: new Set(), dietary: new Set(),
  };
  for (const r of recipes) {
    for (const t of r.tags) sets[t.type]?.add(t.name.trim().toLowerCase());
  }
  const out = {} as Record<TagType, string[]>;
  for (const type of TAG_TYPES) out[type] = Array.from(sets[type]).sort();
  return out;
}
