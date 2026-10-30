// Deterministic board builders: the same level always produces the same board,
// so a page reload (or offline replay) shows exactly what the child saw.

import { ARABIC_ALPHABET, buildWheel, seededRandom, shuffle } from "../arabic";
import type { Blank, Cell, DifficultyLevel, GameBoard, GameType, GameWord, Placement } from "./types";

export function buildBoard(type: GameType, words: GameWord[], difficulty: DifficultyLevel, seed: string, extraLetters: number): GameBoard {
  switch (type) {
    case "WORD_BUILD":
      return { type, wheels: words.map((w) => buildWheel(w.text, extraLetters, w.id)) };
    case "WORD_SEARCH":
      return { type, ...buildWordSearch(words.map((w) => w.letters), difficulty, seed) };
    case "MATCH":
      return { type, ...buildMatch(words.length, seed) };
    case "MISSING_LETTER":
      return { type, blanks: words.map((w) => buildBlanks(w.letters, difficulty, w.id)) };
  }
}

// ───────────── Word search ─────────────

/** [dRow, dCol]. The grid renders right-to-left, so +col reads in Arabic order. */
const DIRECTIONS: Record<DifficultyLevel, Cell[]> = {
  EASY: [[0, 1]],
  MEDIUM: [
    [0, 1],
    [1, 0],
  ],
  HARD: [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ],
};

export function buildWordSearch(words: string[][], difficulty: DifficultyLevel, seed: string) {
  const longest = Math.max(...words.map((w) => w.length));
  const totalLetters = words.reduce((s, w) => s + w.length, 0);
  let size = Math.max(longest, difficulty === "EASY" ? 5 : 6, Math.ceil(Math.sqrt(totalLetters * 2.2)));

  for (; size <= 12; size++) {
    const rand = seededRandom(`${seed}:${size}`);
    const result = tryPlace(words, size, DIRECTIONS[difficulty], rand);
    if (result) {
      const { grid, placements } = result;
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = ARABIC_ALPHABET[Math.floor(rand() * ARABIC_ALPHABET.length)];
      return { grid: grid as string[][], placements };
    }
  }
  throw new Error("Could not build word search grid");
}

function tryPlace(words: string[][], size: number, dirs: Cell[], rand: () => number) {
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const placements: Placement[] = [];
  // Longest first places best; remember original index for the answer key.
  const order = words.map((w, i) => ({ w, i })).sort((a, b) => b.w.length - a.w.length);

  for (const { w, i } of order) {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const [dr, dc] = dirs[Math.floor(rand() * dirs.length)];
      const r0 = Math.floor(rand() * size);
      const c0 = Math.floor(rand() * size);
      const cells: Cell[] = w.map((_, k) => [r0 + dr * k, c0 + dc * k]);
      const fits = cells.every(([r, c], k) => r >= 0 && c >= 0 && r < size && c < size && (grid[r][c] === null || grid[r][c] === w[k]));
      if (!fits) continue;
      cells.forEach(([r, c], k) => (grid[r][c] = w[k]));
      placements.push({ wordIndex: i, cells });
      placed = true;
    }
    if (!placed) return null;
  }
  return { grid, placements: placements.sort((a, b) => a.wordIndex - b.wordIndex) };
}

// ───────────── Match ─────────────

export function buildMatch(count: number, seed: string) {
  const rand = seededRandom(`match:${seed}`);
  const idx = Array.from({ length: count }, (_, i) => i);
  let hintOrder = shuffle(idx, rand);
  // Avoid hints lining up exactly with their words.
  if (count > 1 && hintOrder.every((v, i) => v === i)) hintOrder = [...hintOrder.slice(1), hintOrder[0]];
  return { wordOrder: shuffle(idx, rand), hintOrder };
}

// ───────────── Missing letter ─────────────

const BLANKS: Record<DifficultyLevel, number> = { EASY: 1, MEDIUM: 2, HARD: 2 };

export function buildBlanks(letters: string[], difficulty: DifficultyLevel, seed: string): Blank[] {
  const rand = seededRandom(`blank:${seed}`);
  // Long words get one more blank on HARD; never hide more than half the word.
  const count = Math.max(1, Math.min(BLANKS[difficulty] + (difficulty === "HARD" && letters.length >= 6 ? 1 : 0), Math.floor(letters.length / 2)));
  const positions = shuffle(
    letters.map((_, i) => i),
    rand,
  )
    .slice(0, count)
    .sort((a, b) => a - b);

  return positions.map((index) => {
    const correct = letters[index];
    const pool = ARABIC_ALPHABET.filter((l) => l !== correct);
    const options = shuffle([correct, ...shuffle(pool, rand).slice(0, difficulty === "EASY" ? 2 : 3)], rand);
    return { index, options };
  });
}
