import "server-only";
import { toLetters } from "@/lib/arabic";
import { buildBoard } from "@/lib/games/boards";
import type { GameData } from "@/lib/games/types";
import { extraLetters } from "@/lib/scoring";
import type { PlayableLevel } from "@/server/data/content";

/** Turns a stored level into the data its game player needs (board built per level type). */
export function toGame(level: PlayableLevel): GameData {
  const words = level.words.map((w) => ({
    id: w.id,
    text: w.text,
    letters: toLetters(w.text),
    hint: w.hint,
    fact: w.fact,
    kind: w.kind,
    source: w.surah ? `سورة ${w.surah.name}${w.ayah ? ` · آية ${w.ayah}` : ""}` : null,
    quranText: w.quranText,
  }));
  return {
    meta: {
      id: level.id,
      title: level.title,
      type: level.type,
      difficulty: level.difficulty,
      context: `المرحلة ${level.stage.number} · ${level.title}`,
      backHref: `/stages/${level.stage.id}`,
    },
    words,
    board: buildBoard(level.type, words, level.difficulty, level.id, extraLetters(level.difficulty, level.config)),
  };
}
