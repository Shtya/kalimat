import { test } from "node:test";
import assert from "node:assert/strict";
import { toLetters } from "../src/lib/arabic";
import { buildBlanks, buildMatch, buildWordSearch } from "../src/lib/games/boards";
import { SAMPLE_LEVELS } from "../prisma/seed-content";

const levels = SAMPLE_LEVELS.map((l) => l.items.map((i) => toLetters(i.text)));

test("word search hides every word exactly along its cells, grid fully filled", () => {
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    for (const [i, words] of levels.entries()) {
      const { grid, placements } = buildWordSearch(words, difficulty, `lvl${i}`);
      assert.equal(placements.length, words.length);
      for (const p of placements) assert.equal(p.cells.map(([r, c]) => grid[r][c]).join(""), words[p.wordIndex].join(""));
      for (const row of grid) for (const cell of row) assert.ok(cell && cell.length === 1);
      if (difficulty === "EASY") for (const p of placements) assert.ok(p.cells.every(([r]) => r === p.cells[0][0]), "EASY is horizontal only");
    }
  }
});

test("word search is deterministic per seed", () => {
  assert.deepEqual(buildWordSearch(levels[0], "HARD", "x"), buildWordSearch(levels[0], "HARD", "x"));
});

test("match never lines hints up with their words", () => {
  for (let n = 2; n <= 6; n++)
    for (let s = 0; s < 30; s++) {
      const { wordOrder, hintOrder } = buildMatch(n, `s${s}`);
      assert.deepEqual([...wordOrder].sort(), [...Array(n).keys()]);
      assert.ok(hintOrder.some((v, i) => v !== i));
    }
});

test("missing-letter blanks: correct letter among options, at most half the word hidden", () => {
  for (const words of levels)
    for (const letters of words)
      for (const d of ["EASY", "MEDIUM", "HARD"] as const) {
        const blanks = buildBlanks(letters, d, letters.join(""));
        assert.ok(blanks.length >= 1 && blanks.length <= Math.max(1, Math.floor(letters.length / 2)));
        for (const b of blanks) {
          assert.ok(b.options.includes(letters[b.index]));
          assert.equal(new Set(b.options).size, b.options.length);
        }
      }
});
