// Arabic text helpers shared by the game, the admin validation and the seed.

const DIACRITICS = /[ً-ٰٟـ]/g; // harakat + superscript alef + tatweel

export const ARABIC_ALPHABET = Array.from("ابتثجحخدذرزسشصضطظعغفقكلمنهوي");

/** Removes harakat/tatweel and surrounding whitespace. */
export function normalizeWord(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(/[ۖ-ۭ]/g, "") // Quranic annotation marks (waqf signs, small high letters)
    .replace(/ٱ/g, "ا") // alef wasla ٱ → ا
    .trim();
}

/** Splits a word into its letters (code points), after normalizing. */
export function toLetters(word: string): string[] {
  return Array.from(normalizeWord(word));
}

/** A single Arabic word of 2–9 letters with no spaces, digits or Latin letters. */
export function isValidGameWord(word: string): boolean {
  return /^[ء-ي]{2,9}$/.test(normalizeWord(word));
}

/** Small deterministic PRNG so a level always shuffles the same way on server & client. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Letters for the wheel: the word's letters plus `extra` distractors, shuffled. */
export function buildWheel(word: string, extra: number, seed: string): string[] {
  const letters = toLetters(word);
  const rand = seededRandom(seed);
  const pool = ARABIC_ALPHABET.filter((l) => !letters.includes(l));
  const distractors = shuffle(pool, rand).slice(0, Math.max(0, extra));
  let wheel = shuffle([...letters, ...distractors], rand);
  // Never show the answer already in order.
  if (wheel.join("") === letters.join("") && wheel.length > 1) wheel = [...wheel.slice(1), wheel[0]];
  return wheel;
}
