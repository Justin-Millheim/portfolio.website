import type { Recipe } from "./types";

export function newId(prefix = "r"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyRecipe(userId: string): Recipe {
  const now = new Date().toISOString();
  return {
    id: newId(),
    userId,
    title: "",
    description: "",
    servings: 4,
    ingredients: [],
    instructions: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

// A small starter set shown to first-run guests so browse / filter / scale have
// something to act on. Deliberately spans tag types (the §5 model) so the
// multi-facet filtering is visible immediately — e.g. the pot pie is main +
// chicken + pie at once.
export function seedRecipes(): Recipe[] {
  const now = new Date().toISOString();
  const base = (over: Partial<Recipe>): Recipe => ({
    id: newId("seed"),
    userId: "local",
    title: "",
    servings: 4,
    ingredients: [],
    instructions: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...over,
  });

  return [
    base({
      title: "Chicken Pot Pie",
      description: "Comfort in a crust — creamy chicken and vegetables under flaky pastry.",
      prepTime: 25,
      cookTime: 40,
      servings: 6,
      difficulty: "medium",
      tags: [
        { type: "course", name: "main" },
        { type: "ingredient", name: "chicken" },
        { type: "dish", name: "pie" },
        { type: "cuisine", name: "american" },
      ],
      ingredients: [
        { id: "i1", quantity: 2, unit: "cups", item: "cooked chicken", prep: "shredded" },
        { id: "i2", quantity: 1, unit: "", item: "yellow onion", prep: "diced" },
        { id: "i3", quantity: 2, unit: "cups", item: "mixed vegetables", prep: "frozen" },
        { id: "i4", quantity: 0.33, unit: "cup", item: "butter" },
        { id: "i5", quantity: 0.33, unit: "cup", item: "flour" },
        { id: "i6", quantity: 1.75, unit: "cups", item: "chicken broth" },
        { id: "i7", quantity: 0.67, unit: "cup", item: "milk" },
        { id: "i8", quantity: 2, unit: "", item: "pie crusts" },
        { id: "i9", quantity: null, unit: "to taste", item: "salt and pepper" },
      ],
      instructions: [
        "Preheat oven to 425°F (220°C).",
        "Melt butter in a saucepan, cook onion until soft, then stir in flour to make a roux.",
        "Whisk in broth and milk; simmer until thickened. Season with salt and pepper.",
        "Fold in chicken and vegetables. Pour into a crust-lined pie dish and top with the second crust.",
        "Cut slits in the top and bake 30–40 min until golden. Rest 10 min before serving.",
      ],
    }),
    base({
      title: "Weeknight Tomato Soup",
      description: "A 30-minute creamy tomato soup that tastes like it simmered all day.",
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      difficulty: "easy",
      tags: [
        { type: "course", name: "main" },
        { type: "dish", name: "soup" },
        { type: "ingredient", name: "vegetarian" },
        { type: "dietary", name: "vegetarian" },
      ],
      ingredients: [
        { id: "i1", quantity: 2, unit: "tbsp", item: "olive oil" },
        { id: "i2", quantity: 1, unit: "", item: "onion", prep: "chopped" },
        { id: "i3", quantity: 3, unit: "cloves", item: "garlic", prep: "minced" },
        { id: "i4", quantity: 28, unit: "oz", item: "canned tomatoes" },
        { id: "i5", quantity: 2, unit: "cups", item: "vegetable broth" },
        { id: "i6", quantity: 0.5, unit: "cup", item: "heavy cream" },
        { id: "i7", quantity: null, unit: "to taste", item: "basil and salt" },
      ],
      instructions: [
        "Warm olive oil over medium heat; soften onion and garlic, 5 min.",
        "Add tomatoes and broth; simmer 15 min.",
        "Blend until smooth, stir in cream, and season to taste.",
      ],
    }),
    base({
      title: "Sheet-Pan Beef Stir-Fry",
      description: "Fast, saucy, and all on one pan — weeknight dinner sorted.",
      prepTime: 15,
      cookTime: 15,
      servings: 4,
      difficulty: "easy",
      tags: [
        { type: "course", name: "main" },
        { type: "ingredient", name: "beef" },
        { type: "dish", name: "stir-fry" },
        { type: "cuisine", name: "chinese" },
      ],
      ingredients: [
        { id: "i1", quantity: 1, unit: "lb", item: "flank steak", prep: "thinly sliced" },
        { id: "i2", quantity: 4, unit: "cups", item: "broccoli florets" },
        { id: "i3", quantity: 1, unit: "", item: "red bell pepper", prep: "sliced" },
        { id: "i4", quantity: 0.33, unit: "cup", item: "soy sauce" },
        { id: "i5", quantity: 2, unit: "tbsp", item: "honey" },
        { id: "i6", quantity: 1, unit: "tbsp", item: "fresh ginger", prep: "grated" },
        { id: "i7", quantity: 2, unit: "tbsp", item: "sesame oil" },
      ],
      instructions: [
        "Heat oven to 450°F (230°C). Whisk soy sauce, honey, ginger, and sesame oil.",
        "Toss beef and vegetables with the sauce on a sheet pan.",
        "Roast 12–15 min, tossing once, until beef is cooked and edges char. Serve over rice.",
      ],
    }),
  ];
}
