import type { Category } from "./types";

export interface CategoryMeta {
  id: Category;
  label: string;
  emoji: string;
  color: string;  // section accent
}

// Ordered as you'd walk a store; this order is the "by aisle" sort.
export const CATEGORIES: CategoryMeta[] = [
  { id: "produce", label: "Produce", emoji: "🥬", color: "#4caf50" },
  { id: "meat", label: "Meat & Seafood", emoji: "🥩", color: "#e1564a" },
  { id: "dairy", label: "Dairy & Eggs", emoji: "🧀", color: "#f3c14b" },
  { id: "bakery", label: "Bakery", emoji: "🍞", color: "#c9925e" },
  { id: "deli", label: "Deli", emoji: "🥪", color: "#d98a5a" },
  { id: "frozen", label: "Frozen", emoji: "🧊", color: "#56b6d4" },
  { id: "pantry", label: "Pantry & Canned", emoji: "🥫", color: "#b08968" },
  { id: "baking", label: "Baking & Spices", emoji: "🧁", color: "#c98ac2" },
  { id: "condiments", label: "Condiments & Sauces", emoji: "🫙", color: "#e09f3e" },
  { id: "snacks", label: "Snacks", emoji: "🍿", color: "#e6a23c" },
  { id: "beverages", label: "Beverages", emoji: "🥤", color: "#5c8df0" },
  { id: "breakfast", label: "Breakfast & Cereal", emoji: "🥣", color: "#d4a24e" },
  { id: "household", label: "Household", emoji: "🧻", color: "#8aa0b8" },
  { id: "personal", label: "Personal Care", emoji: "🧴", color: "#9b8ec9" },
  { id: "other", label: "Other", emoji: "🛒", color: "#9aa3a0" },
];

const BY_ID: Record<Category, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<Category, CategoryMeta>;

export function categoryMeta(id: Category): CategoryMeta {
  return BY_ID[id] ?? BY_ID.other;
}

export const CATEGORY_ORDER: Record<Category, number> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c.id, i])
) as Record<Category, number>;
