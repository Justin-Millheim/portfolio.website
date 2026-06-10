// Suspect material. The generator draws 20 names, sorts them alphabetically (as
// the source game does), and assigns each a profession from a small set so that
// professions cluster into groups of 2–4 — which is what makes profession clues
// ("exactly two cops are criminals") meaningful. The profession carries the
// emoji mugshot, so no image assets are needed.

export interface Profession {
  title: string;   // shown under the name, e.g. "cop"
  emoji: string;
}

export const PROFESSIONS: Profession[] = [
  { title: "cop", emoji: "👮" },
  { title: "judge", emoji: "🧑‍⚖️" },
  { title: "pilot", emoji: "🧑‍✈️" },
  { title: "builder", emoji: "👷" },
  { title: "farmer", emoji: "🧑‍🌾" },
  { title: "cook", emoji: "🧑‍🍳" },
  { title: "painter", emoji: "🧑‍🎨" },
  { title: "doctor", emoji: "🧑‍⚕️" },
  { title: "teacher", emoji: "🧑‍🏫" },
  { title: "guard", emoji: "💂" },
  { title: "coder", emoji: "🧑‍💻" },
  { title: "singer", emoji: "🧑‍🎤" },
  { title: "pilot", emoji: "🧑‍✈️" },
  { title: "clerk", emoji: "🧑‍💼" },
  { title: "scientist", emoji: "🧑‍🔬" },
  { title: "sailor", emoji: "🧑‍✈️" },
];

// Plenty of names so a 20-draw still has variety puzzle to puzzle.
export const NAME_POOL: string[] = [
  "Achilles", "Beck", "Cleo", "Dev", "Esme", "Faye", "Gus", "Hank", "Iris", "Juna",
  "Klay", "Lena", "Mara", "Noah", "Opal", "Priya", "Quita", "Ravi", "Sage", "Tariq",
  "Usain", "Vera", "Wanda", "Xena", "Yara", "Zeno", "Bram", "Cole", "Dot", "Felix",
  "Halle", "Ivo", "Nadia", "Otis", "Paula", "Rex", "Sol", "Theo", "Vicky", "Wren",
];
