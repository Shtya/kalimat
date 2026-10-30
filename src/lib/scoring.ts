// Pure scoring rules (shared by server, seed and the client offline estimate) — the server is authoritative; the client only reports what happened.
// Every game type uses the same formula with its own time budget per word.

import type { DifficultyLevel, GameType } from "./games/types";

export type AttemptStats = { wordCount: number; timeSpent: number; hintsUsed: number; mistakes: number };
export type AttemptResult = { score: number; stars: number };

const SECONDS_PER_WORD: Record<DifficultyLevel, number> = { EASY: 20, MEDIUM: 25, HARD: 30 };
const DIFFICULTY_BONUS: Record<DifficultyLevel, number> = { EASY: 1, MEDIUM: 1.25, HARD: 1.5 };

/** Relative time a word takes in each mode (searching a grid is slower than matching). */
const TYPE_PACE: Record<GameType, number> = { WORD_BUILD: 1, WORD_SEARCH: 1.4, MATCH: 0.6, MISSING_LETTER: 0.7 };

export function parTime(type: GameType, wordCount: number, difficulty: DifficultyLevel): number {
  return Math.round(wordCount * SECONDS_PER_WORD[difficulty] * TYPE_PACE[type]);
}

export function scoreAttempt(type: GameType, difficulty: DifficultyLevel, s: AttemptStats): AttemptResult {
  const par = parTime(type, s.wordCount, difficulty);
  const base = s.wordCount * 100;
  const timeBonus = Math.max(0, par - s.timeSpent) * 2;
  const penalty = s.hintsUsed * 25 + s.mistakes * 5;
  const raw = Math.max(s.wordCount * 10, base + timeBonus - penalty);
  const score = Math.round(raw * DIFFICULTY_BONUS[difficulty]);

  let stars = 1;
  if (s.hintsUsed === 0 && s.mistakes <= s.wordCount && s.timeSpent <= par) stars = 3;
  else if (s.hintsUsed <= Math.ceil(s.wordCount / 3) && s.timeSpent <= par * 2) stars = 2;
  return { score, stars };
}

/** Distractor letters added to the wheel by difficulty (overridable per level via config.extraLetters). */
export function extraLetters(difficulty: DifficultyLevel, config: unknown): number {
  const fromConfig = (config as { extraLetters?: unknown } | null)?.extraLetters;
  if (typeof fromConfig === "number" && fromConfig >= 0 && fromConfig <= 4) return fromConfig;
  return difficulty === "EASY" ? 0 : difficulty === "MEDIUM" ? 1 : 2;
}

/** Word-count limits per mode, enforced when a level is published. */
export const WORD_LIMITS: Record<GameType, { min: number; max: number }> = {
  WORD_BUILD: { min: 1, max: 12 },
  WORD_SEARCH: { min: 2, max: 8 },
  MATCH: { min: 2, max: 6 },
  MISSING_LETTER: { min: 1, max: 12 },
};
