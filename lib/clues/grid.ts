// Board geometry for /clues. A 4-wide (columns A–D) by 5-tall (rows 1–5) grid of
// 20 suspects. Index i maps to col = i%4, row = floor(i/4). All clue regions
// ("my neighbours", "the edge", "between A and B", "row 3", "the cops") resolve
// to plain index lists through these helpers so the engine stays generic.

export const COLS = 4;
export const ROWS = 5;
export const SIZE = COLS * ROWS; // 20

export const rowOf = (i: number) => Math.floor(i / COLS);
export const colOf = (i: number) => i % COLS;

const COL_LETTERS = ["A", "B", "C", "D"];
export const colLetter = (c: number) => COL_LETTERS[c] ?? "?";
// Grid label as shown on each card, e.g. index 0 -> "A1", index 19 -> "D5".
export const coord = (i: number) => `${colLetter(colOf(i))}${rowOf(i) + 1}`;

export function rowMembersByR(r: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) out.push(r * COLS + c);
  return out;
}
export function colMembersByC(c: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < ROWS; r++) out.push(r * COLS + c);
  return out;
}
export const rowMembers = (i: number) => rowMembersByR(rowOf(i));
export const colMembers = (i: number) => colMembersByC(colOf(i));

// 8-directional neighbours (orthogonal + diagonal), speaker excluded. Up to 8.
export function neighbors(i: number): number[] {
  const r = rowOf(i);
  const c = colOf(i);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc);
    }
  }
  return out;
}

// The four physical corners.
export const CORNERS = [0, COLS - 1, (ROWS - 1) * COLS, ROWS * COLS - 1];

// The 14 suspects around the perimeter (corners included).
export const EDGE = (() => {
  const set = new Set<number>();
  for (let c = 0; c < COLS; c++) { set.add(c); set.add((ROWS - 1) * COLS + c); }
  for (let r = 0; r < ROWS; r++) { set.add(r * COLS); set.add(r * COLS + COLS - 1); }
  return Array.from(set).sort((a, b) => a - b);
})();

// The suspects strictly between two cells that share a row or column (exclusive).
// Returns [] when the pair isn't aligned.
export function between(a: number, b: number): number[] {
  if (rowOf(a) === rowOf(b)) {
    const r = rowOf(a);
    const [lo, hi] = [colOf(a), colOf(b)].sort((x, y) => x - y);
    const out: number[] = [];
    for (let c = lo + 1; c < hi; c++) out.push(r * COLS + c);
    return out;
  }
  if (colOf(a) === colOf(b)) {
    const c = colOf(a);
    const [lo, hi] = [rowOf(a), rowOf(b)].sort((x, y) => x - y);
    const out: number[] = [];
    for (let r = lo + 1; r < hi; r++) out.push(r * COLS + c);
    return out;
  }
  return [];
}

// Suspects who neighbour both a and b (neither a nor b included).
export function commonNeighbors(a: number, b: number): number[] {
  const nb = new Set(neighbors(b));
  return neighbors(a).filter((i) => nb.has(i) && i !== a && i !== b);
}
