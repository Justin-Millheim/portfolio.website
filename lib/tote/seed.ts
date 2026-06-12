import type { GroceryList, ToteRecipe, RecipeLine, GroceryItem } from "./types";
import { categorize } from "./catalog";

export function newId(prefix = "t"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyList(userId: string, name = "Groceries"): GroceryList {
  const now = new Date().toISOString();
  return { id: newId("l"), userId, name, items: [], sort: "aisle", createdAt: now, updatedAt: now };
}

export function emptyRecipe(userId: string): ToteRecipe {
  const now = new Date().toISOString();
  return { id: newId("r"), userId, name: "", servings: 4, lines: [], steps: [], createdAt: now, updatedAt: now };
}

export function newItem(name: string, quantity: string): GroceryItem {
  return {
    id: newId("i"), name: name.trim(), quantity: quantity.trim(),
    category: categorize(name), checked: false, addedAt: new Date().toISOString(),
  };
}

function line(quantity: number | null, unit: string, item: string): RecipeLine {
  return { id: newId("rl"), quantity, unit, item, category: categorize(item) };
}

// First-run demo content for guests.
export function seedLists(): GroceryList[] {
  const now = new Date().toISOString();
  const items: GroceryItem[] = [
    newItem("bananas", "1 bunch"),
    newItem("milk", "1 gal"),
    newItem("chicken breast", "2 lb"),
    newItem("sourdough bread", "1"),
    newItem("olive oil", ""),
    newItem("spinach", "1 bag"),
  ];
  return [{ id: "seed_list_groceries", userId: "local", name: "Groceries", items, sort: "aisle", createdAt: now, updatedAt: now }];
}

export function seedRecipes(): ToteRecipe[] {
  const now = new Date().toISOString();
  const base = (over: Partial<ToteRecipe>): ToteRecipe => ({
    id: newId("r"), userId: "local", name: "", servings: 4, lines: [], steps: [], createdAt: now, updatedAt: now, ...over,
  });
  return [
    base({
      name: "Sheet-Pan Chicken & Veggies",
      servings: 4,
      lines: [
        line(2, "lb", "chicken breast"),
        line(4, "cups", "broccoli"),
        line(1, "", "red bell pepper"),
        line(3, "tbsp", "olive oil"),
        line(1, "tsp", "garlic powder"),
      ],
      steps: [
        "Heat oven to 425°F. Toss everything with oil and seasoning on a sheet pan.",
        "Roast 22–25 min until chicken is cooked through.",
      ],
    }),
    base({
      name: "Weeknight Tomato Pasta",
      servings: 4,
      lines: [
        line(1, "lb", "spaghetti"),
        line(1, "jar", "pasta sauce"),
        line(2, "cloves", "garlic"),
        line(0.5, "cup", "parmesan"),
        line(2, "tbsp", "olive oil"),
      ],
      steps: [
        "Boil pasta to al dente; reserve a splash of water.",
        "Warm sauce with garlic and oil, toss with pasta, finish with parmesan.",
      ],
    }),
  ];
}
