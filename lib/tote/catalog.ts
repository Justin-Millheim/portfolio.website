import type { Category } from "./types";

// Built-in grocery catalog: canonical item names grouped by the aisle they
// belong to. This powers two things at once — autocomplete suggestions and the
// auto-categorizer. Deliberately broad-but-rudimentary (~250 staples); the
// keyword fallback below catches the long tail.
export const CATALOG: Record<Category, string[]> = {
  produce: [
    "apple", "banana", "orange", "lemon", "lime", "grapes", "strawberries", "blueberries",
    "raspberries", "avocado", "tomato", "cherry tomatoes", "potato", "sweet potato", "onion",
    "red onion", "garlic", "ginger", "carrot", "celery", "broccoli", "cauliflower", "spinach",
    "kale", "lettuce", "romaine", "cucumber", "bell pepper", "jalapeno", "mushrooms", "zucchini",
    "green beans", "asparagus", "corn", "peas", "cabbage", "cilantro", "parsley", "basil",
    "green onion", "scallions", "mango", "pineapple", "peach", "pear", "watermelon", "cantaloupe",
    "squash", "brussels sprouts", "eggplant", "radish", "beets", "shallot", "leek",
  ],
  meat: [
    "chicken breast", "chicken thighs", "chicken wings", "whole chicken", "ground beef",
    "steak", "ribeye", "sirloin", "ground turkey", "turkey", "pork chops", "pork tenderloin",
    "bacon", "sausage", "ground pork", "ham", "salmon", "shrimp", "tuna", "tilapia", "cod",
    "crab", "lobster", "scallops", "ground chicken", "ribs", "brisket", "hot dogs", "lamb",
  ],
  dairy: [
    "milk", "whole milk", "almond milk", "oat milk", "soy milk", "heavy cream", "half and half",
    "butter", "eggs", "cheese", "cheddar", "mozzarella", "parmesan", "cream cheese", "sour cream",
    "yogurt", "greek yogurt", "cottage cheese", "feta", "string cheese", "whipped cream",
    "ricotta", "buttermilk",
  ],
  bakery: [
    "bread", "white bread", "wheat bread", "sourdough", "bagels", "english muffins", "tortillas",
    "buns", "hamburger buns", "hot dog buns", "rolls", "croissant", "muffins", "pita", "naan",
    "baguette", "donuts", "cake", "pie crust",
  ],
  deli: [
    "deli ham", "deli turkey", "roast beef", "salami", "pepperoni", "prosciutto", "sliced cheese",
    "hummus", "olives", "rotisserie chicken",
  ],
  frozen: [
    "frozen pizza", "ice cream", "frozen vegetables", "frozen berries", "frozen fruit",
    "frozen waffles", "frozen fries", "frozen chicken", "frozen shrimp", "popsicles",
    "frozen dinners", "frozen broccoli", "frozen peas", "tater tots", "frozen burritos",
  ],
  pantry: [
    "rice", "white rice", "brown rice", "pasta", "spaghetti", "penne", "macaroni", "noodles",
    "quinoa", "oats", "oatmeal", "cereal", "flour", "beans", "black beans", "kidney beans",
    "chickpeas", "lentils", "canned tomatoes", "tomato sauce", "tomato paste", "chicken broth",
    "beef broth", "vegetable broth", "canned corn", "canned tuna", "peanut butter", "jelly",
    "honey", "crackers", "bread crumbs", "couscous", "ramen", "canned soup", "coconut milk",
    "refried beans", "salsa", "pasta sauce", "marinara",
  ],
  baking: [
    "sugar", "brown sugar", "powdered sugar", "baking soda", "baking powder", "vanilla",
    "vanilla extract", "yeast", "chocolate chips", "cocoa powder", "cornstarch", "salt",
    "pepper", "cinnamon", "paprika", "cumin", "oregano", "garlic powder", "onion powder",
    "chili powder", "red pepper flakes", "bay leaves", "nutmeg", "powdered sugar", "molasses",
    "almond flour", "cake mix", "frosting",
  ],
  condiments: [
    "ketchup", "mustard", "mayo", "mayonnaise", "soy sauce", "hot sauce", "bbq sauce",
    "ranch", "olive oil", "vegetable oil", "canola oil", "vinegar", "balsamic vinegar",
    "sesame oil", "worcestershire", "sriracha", "teriyaki", "maple syrup", "salad dressing",
    "relish", "pickles", "fish sauce", "oyster sauce",
  ],
  snacks: [
    "chips", "tortilla chips", "pretzels", "popcorn", "granola bars", "nuts", "almonds",
    "peanuts", "cashews", "trail mix", "cookies", "candy", "chocolate", "crackers", "fruit snacks",
    "rice cakes", "beef jerky", "goldfish", "graham crackers",
  ],
  beverages: [
    "water", "sparkling water", "soda", "coke", "juice", "orange juice", "apple juice",
    "coffee", "tea", "lemonade", "sports drink", "energy drink", "beer", "wine", "kombucha",
    "milk alternative", "creamer", "gatorade", "seltzer",
  ],
  breakfast: [
    "cereal", "granola", "pancake mix", "syrup", "oatmeal", "breakfast bars", "pop tarts",
    "instant oatmeal", "grits", "waffle mix",
  ],
  household: [
    "paper towels", "toilet paper", "napkins", "dish soap", "dishwasher pods", "laundry detergent",
    "trash bags", "paper plates", "plastic wrap", "aluminum foil", "ziploc bags", "sponges",
    "all purpose cleaner", "bleach", "fabric softener", "light bulbs", "batteries", "tissues",
    "hand soap",
  ],
  personal: [
    "shampoo", "conditioner", "body wash", "soap", "toothpaste", "toothbrush", "deodorant",
    "floss", "razors", "shaving cream", "lotion", "sunscreen", "cotton swabs", "band aids",
    "vitamins", "ibuprofen", "tylenol", "feminine products", "face wash", "mouthwash",
  ],
  other: [],
};

// Exact-name lookup built once from the catalog.
const EXACT: Map<string, Category> = (() => {
  const m = new Map<string, Category>();
  (Object.keys(CATALOG) as Category[]).forEach((cat) => {
    for (const name of CATALOG[cat]) m.set(name.toLowerCase(), cat);
  });
  return m;
})();

// Keyword fallback rules — ordered, first hit wins. Each is a substring that
// strongly implies a category, catching items not spelled exactly like a catalog
// entry ("boneless chicken thighs" -> contains "chicken" -> meat).
const KEYWORDS: [string, Category][] = [
  // dairy before meat so "chicken broth" doesn't read as meat via "chicken"
  ["milk", "dairy"], ["cheese", "dairy"], ["yogurt", "dairy"], ["cream", "dairy"],
  ["butter", "dairy"], ["egg", "dairy"],
  ["broth", "pantry"], ["stock", "pantry"], ["bean", "pantry"], ["rice", "pantry"],
  ["pasta", "pantry"], ["noodle", "pantry"], ["soup", "pantry"], ["canned", "pantry"],
  ["sauce", "condiments"], ["oil", "condiments"], ["vinegar", "condiments"],
  ["dressing", "condiments"], ["ketchup", "condiments"], ["mustard", "condiments"],
  ["chicken", "meat"], ["beef", "meat"], ["pork", "meat"], ["turkey", "meat"],
  ["bacon", "meat"], ["sausage", "meat"], ["steak", "meat"], ["fish", "meat"],
  ["shrimp", "meat"], ["salmon", "meat"], ["meat", "meat"], ["lamb", "meat"],
  ["frozen", "frozen"], ["ice cream", "frozen"],
  ["bread", "bakery"], ["bagel", "bakery"], ["tortilla", "bakery"], ["bun", "bakery"],
  ["roll", "bakery"], ["muffin", "bakery"],
  ["apple", "produce"], ["banana", "produce"], ["lettuce", "produce"], ["tomato", "produce"],
  ["onion", "produce"], ["pepper", "produce"], ["berry", "produce"], ["fruit", "produce"],
  ["vegetable", "produce"], ["potato", "produce"], ["garlic", "produce"], ["lemon", "produce"],
  ["lime", "produce"], ["carrot", "produce"], ["spinach", "produce"], ["avocado", "produce"],
  ["sugar", "baking"], ["flour", "baking"], ["baking", "baking"], ["vanilla", "baking"],
  ["cinnamon", "baking"], ["spice", "baking"], ["salt", "baking"], ["powder", "baking"],
  ["chip", "snacks"], ["cookie", "snacks"], ["cracker", "snacks"], ["candy", "snacks"],
  ["nut", "snacks"], ["popcorn", "snacks"], ["snack", "snacks"],
  ["water", "beverages"], ["juice", "beverages"], ["soda", "beverages"], ["coffee", "beverages"],
  ["tea", "beverages"], ["beer", "beverages"], ["wine", "beverages"], ["drink", "beverages"],
  ["cereal", "breakfast"], ["oat", "breakfast"], ["pancake", "breakfast"], ["syrup", "condiments"],
  ["paper", "household"], ["soap", "household"], ["detergent", "household"], ["trash", "household"],
  ["towel", "household"], ["cleaner", "household"], ["foil", "household"], ["bag", "household"],
  ["shampoo", "personal"], ["toothpaste", "personal"], ["deodorant", "personal"],
  ["razor", "personal"], ["lotion", "personal"], ["vitamin", "personal"],
];

// Auto-assign a category for an item name. Exact catalog match wins; otherwise
// the first matching keyword; otherwise "other".
export function categorize(rawName: string): Category {
  const name = rawName.trim().toLowerCase();
  if (!name) return "other";
  const exact = EXACT.get(name);
  if (exact) return exact;
  for (const [kw, cat] of KEYWORDS) {
    if (name.includes(kw)) return cat;
  }
  return "other";
}

// Flat, sorted catalog for autocomplete ranking.
export const CATALOG_ITEMS: string[] = Array.from(EXACT.keys()).sort();
