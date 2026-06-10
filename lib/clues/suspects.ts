// A pool of suspects. The generator draws 20 per puzzle and assigns each a
// stable grid index. Names are deliberately plain and a touch noir; avatars are
// just emoji mugshots so the board reads at a glance with zero image assets.

interface SuspectSeed {
  name: string;
  avatar: string;
}

export const SUSPECT_POOL: SuspectSeed[] = [
  { name: "Mara", avatar: "🕵️" },
  { name: "Dev", avatar: "🧑‍💼" },
  { name: "Iris", avatar: "👩‍🎨" },
  { name: "Cole", avatar: "🧑‍🔧" },
  { name: "Nadia", avatar: "💃" },
  { name: "Theo", avatar: "🧑‍🍳" },
  { name: "Wren", avatar: "🧝" },
  { name: "Otis", avatar: "👨‍🌾" },
  { name: "Priya", avatar: "👩‍⚕️" },
  { name: "Hugo", avatar: "🤵" },
  { name: "Sage", avatar: "🧙" },
  { name: "Beck", avatar: "🧑‍🚀" },
  { name: "Lena", avatar: "👩‍🏫" },
  { name: "Ravi", avatar: "🧑‍💻" },
  { name: "Juna", avatar: "👩‍🔬" },
  { name: "Felix", avatar: "🧛" },
  { name: "Opal", avatar: "👵" },
  { name: "Tariq", avatar: "👳" },
  { name: "Vera", avatar: "🦹" },
  { name: "Gus", avatar: "👮" },
  { name: "Esme", avatar: "👩‍✈️" },
  { name: "Niko", avatar: "🧑‍🎤" },
  { name: "Dot", avatar: "👧" },
  { name: "Rex", avatar: "🕴️" },
  { name: "Halle", avatar: "👩‍🚒" },
  { name: "Sol", avatar: "🧑‍🌾" },
  { name: "Bram", avatar: "🧑‍⚖️" },
  { name: "Cleo", avatar: "👸" },
  { name: "Ivo", avatar: "🧑‍🚒" },
  { name: "Faye", avatar: "🧚" },
];
