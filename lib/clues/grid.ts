// Board geometry for /clues. A 4-wide by 5-tall grid of 20 suspects.
// Index i maps to row = floor(i/4), col = i%4. Kept in one place so clue
// regions ("my row", "my neighbors", "the corners") all agree.

export const COLS = 4;
export const ROWS = 5;
export const SIZE = COLS * ROWS; // 20

export const rowOf = (i: number) => Math.floor(i / COLS);
export const colOf = (i: number) => i % COLS;

export function rowMembers(i: number): number[] {
  const r = rowOf(i);
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) out.push(r * COLS + c);
  return out;
}

export function colMembers(i: number): number[] {
  const c = colOf(i);
  const out: number[] = [];
  for (let r = 0; r < ROWS; r++) out.push(r * COLS + c);
  return out;
}

// Orthogonal neighbours (up/down/left/right), speaker excluded.
export function neighbors(i: number): number[] {
  const r = rowOf(i);
  const c = colOf(i);
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * COLS + c);
  if (r < ROWS - 1) out.push((r + 1) * COLS + c);
  if (c > 0) out.push(r * COLS + (c - 1));
  if (c < COLS - 1) out.push(r * COLS + (c + 1));
  return out;
}

// The four physical corners of the board.
export const CORNERS = [0, COLS - 1, (ROWS - 1) * COLS, ROWS * COLS - 1];
