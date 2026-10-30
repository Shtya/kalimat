import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidGameWord, normalizeWord } from "../src/lib/arabic";
import { CURRICULUM, STAGES } from "../src/lib/quran/curriculum";
import { findSurah, SURAHS } from "../src/lib/quran/surahs";
import { parseAudience, parseKind, parseType } from "../src/lib/quran/labels";
import { SAMPLE_LEVELS } from "../prisma/seed-content";

test("114 surahs with 6236 ayahs in total", () => {
  assert.equal(SURAHS.length, 114);
  assert.equal(SURAHS.reduce((s, x) => s + x.ayahCount, 0), 6236);
});

test("curriculum: 6 stations × 4 stages numbered 1–24 covering every surah once (البقرة split in two)", () => {
  assert.equal(CURRICULUM.length, 6);
  for (const st of CURRICULUM) assert.equal(st.stages.length, 4);
  assert.deepEqual(STAGES.map((s) => s.number), Array.from({ length: 24 }, (_, i) => i + 1));
  const seen = STAGES.flatMap((s) => s.surahs.map((x) => x.surah)).sort((a, b) => a - b);
  const expected = [...Array.from({ length: 114 }, (_, i) => i + 1), 2].sort((a, b) => a - b);
  assert.deepEqual(seen, expected);
  const baqara = STAGES.flatMap((s) => s.surahs).filter((x) => x.surah === 2);
  assert.equal(baqara[0].toAyah! + 1, baqara[1].fromAyah);
  assert.equal(baqara[1].toAyah, 286);
});

test("findSurah accepts numbers, names, 'سورة' prefix and spelling variants", () => {
  assert.equal(findSurah("12")?.name, "يوسف");
  assert.equal(findSurah("١١٢")?.name, "الإخلاص");
  assert.equal(findSurah("سورة الإخلاص")?.number, 112);
  assert.equal(findSurah("الاخلاص")?.number, 112);
  assert.equal(findSurah("نبأ")?.number, 78);
  assert.equal(findSurah("آل عمران")?.number, 3);
  assert.equal(findSurah("ال عمران")?.number, 3);
  assert.equal(findSurah("الشورى")?.number, 42);
  assert.equal(findSurah("الشوري")?.number, 42);
  assert.equal(findSurah("ليست سورة"), null);
  assert.equal(findSurah("115"), null);
});

test("normalizeWord turns Quranic spelling marks into playable letters", () => {
  assert.equal(normalizeWord("ٱلرَّحْمَٰنِ"), "الرحمن");
  assert.ok(isValidGameWord("ٱلصَّمَدُ"));
});

test("label parsers accept Arabic and enum spellings", () => {
  assert.equal(parseType("عجلة الحروف"), "WORD_BUILD");
  assert.equal(parseType("أكمل الكلمة"), "MISSING_LETTER");
  assert.equal(parseType("MATCH"), "MATCH");
  assert.equal(parseAudience("الطفولة"), "CHILD");
  assert.equal(parseAudience("الكل"), "ALL");
  assert.equal(parseKind("قيمة وسلوك"), "VALUE");
  assert.equal(parseKind("غير معروف"), null);
});

test("sample content: valid words, ayah numbers inside their surah", () => {
  for (const level of SAMPLE_LEVELS)
    for (const item of level.items) {
      assert.ok(isValidGameWord(item.text), item.text);
      assert.ok(item.ayah >= 1 && item.ayah <= SURAHS[item.surah - 1].ayahCount, `${item.text} ${item.surah}:${item.ayah}`);
    }
});
