import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWheel, isValidGameWord, normalizeWord, toLetters } from "../src/lib/arabic";
import { extraLetters, scoreAttempt } from "../src/lib/scoring";
import { SAMPLE_LEVELS } from "../prisma/seed-content";

test("normalizeWord strips harakat and tatweel", () => {
  assert.equal(normalizeWord(" مَدْرَسـة "), "مدرسة");
});

test("toLetters keeps hamza/taa marbuta forms as single letters", () => {
  assert.deepEqual(toLetters("أسرة"), ["أ", "س", "ر", "ة"]);
});

test("isValidGameWord rejects spaces, digits and latin", () => {
  assert.ok(isValidGameWord("قمر"));
  assert.ok(!isValidGameWord("ابن بطوطة"));
  assert.ok(!isValidGameWord("abc"));
  assert.ok(!isValidGameWord("ق1"));
});

test("buildWheel contains every letter + distractors, deterministic, never pre-solved", () => {
  const a = buildWheel("مسجد", 2, "lvl1");
  const b = buildWheel("مسجد", 2, "lvl1");
  assert.deepEqual(a, b);
  assert.equal(a.length, 6);
  for (const l of toLetters("مسجد")) assert.ok(a.includes(l));
  for (let i = 0; i < 50; i++) assert.notEqual(buildWheel("قمر", 0, `s${i}`).join(""), "قمر");
});

test("perfect fast run gets 3 stars, hints reduce stars and score", () => {
  const perfect = scoreAttempt("WORD_BUILD", "EASY", { wordCount: 4, timeSpent: 30, hintsUsed: 0, mistakes: 0 });
  const hinted = scoreAttempt("WORD_BUILD", "EASY", { wordCount: 4, timeSpent: 30, hintsUsed: 2, mistakes: 0 });
  const slow = scoreAttempt("WORD_BUILD", "EASY", { wordCount: 4, timeSpent: 600, hintsUsed: 5, mistakes: 20 });
  assert.equal(perfect.stars, 3);
  assert.equal(hinted.stars, 2);
  assert.equal(slow.stars, 1);
  assert.ok(perfect.score > hinted.score && hinted.score > slow.score);
  assert.ok(slow.score >= 40);
});

test("difficulty sets distractors unless overridden by config", () => {
  assert.equal(extraLetters("EASY", null), 0);
  assert.equal(extraLetters("HARD", null), 2);
  assert.equal(extraLetters("HARD", { extraLetters: 1 }), 1);
});

test("all seed words are valid game words", () => {
  for (const l of SAMPLE_LEVELS) for (const { text } of l.items) assert.ok(isValidGameWord(text), text);
});
