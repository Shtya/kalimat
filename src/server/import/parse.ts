// Turns sheet rows into validated levels. Pure: no database, so it is unit-tested directly.

import { isValidGameWord, normalizeWord } from "@/lib/arabic";
import { GAME_TYPE_LABEL } from "@/lib/format";
import type { GameType } from "@/lib/games/types";
import { stageSurahs } from "@/lib/quran/curriculum";
import { parseAudience, parseDifficulty, parseKind, parseType, type AudienceValue, type Kind } from "@/lib/quran/labels";
import { findSurah } from "@/lib/quran/surahs";
import { WORD_LIMITS } from "@/lib/scoring";
import { COLUMNS, type ColumnKey } from "./columns";

/** Header of a column as the teacher sees it in the sheet. */
const H = (key: ColumnKey) => COLUMNS.find((c) => c.key === key)!.header;

export type RawRow = { row: number; cells: Partial<Record<ColumnKey, string>> };

export type ParsedItem = { row: number; text: string; hint: string; fact: string; kind: Kind; surahNumber: number; ayah: number | null; quranText: string | null };
export type ParsedLevel = {
  stage: number;
  order: number;
  title: string;
  type: GameType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  audience: AudienceValue;
  surahNumber: number | null;
  items: ParsedItem[];
  firstRow: number;
};
/** `column` is the sheet header the problem is in, shown next to the row number in the report. */
export type Issue = { row: number | null; message: string; column?: string };
export type ParseResult = { levels: ParsedLevel[]; errors: Issue[]; warnings: Issue[]; rowCount: number };

const toInt = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).trim());
  return Number.isInteger(n) ? n : NaN;
};

export function parseRows(rows: RawRow[]): ParseResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  // Errors on a row also mark its level, so the level's question-count check is skipped.
  let currentGroup: { hasErrors: boolean } | null = null;
  const err = (row: number | null, message: string, column?: string) => {
    errors.push({ row, message, column });
    if (currentGroup) currentGroup.hasErrors = true;
  };
  const groups = new Map<string, { level: Partial<ParsedLevel> & { stage: number; order: number; firstRow: number }; items: ParsedItem[]; hasErrors: boolean }>();
  let rowCount = 0;

  for (const { row, cells } of rows) {
    const c = (k: ColumnKey) => (cells[k] ?? "").trim();
    if (Object.values(cells).every((v) => !v || !v.trim())) continue; // blank row
    rowCount++;
    currentGroup = null;

    const stage = toInt(c("stage"));
    const order = toInt(c("level"));
    if (stage === null || Number.isNaN(stage) || stage < 1 || stage > 24) {
      err(row, c("stage") ? `رقم المرحلة «${c("stage")}» غير صحيح: يجب أن يكون من 1 إلى 24.` : "رقم المرحلة فارغ (من 1 إلى 24).", H("stage"));
      continue;
    }
    if (order === null || Number.isNaN(order) || order < 1 || order > 500) {
      err(row, c("level") ? `رقم المستوى «${c("level")}» غير صحيح: يجب أن يكون رقمًا صحيحًا من 1 فأكثر.` : "رقم المستوى فارغ.", H("level"));
      continue;
    }

    const key = `${stage}:${order}`;
    const group = groups.get(key) ?? { level: { stage, order, firstRow: row }, items: [], hasErrors: false };
    groups.set(key, group);
    currentGroup = group;
    const lv = group.level;

    // Level-wide columns: taken from the first row that fills them; a different value later is an error.
    const levelField = <T,>(key: ColumnKey, raw: string, parse: (v: string) => T | null, current: T | undefined, set: (v: T) => void) => {
      if (!raw) return;
      const name = H(key);
      const value = parse(raw);
      if (value === null) return err(row, key === "title" ? "عنوان المستوى يجب أن يكون بين 2 و80 حرفًا." : `قيمة «${raw}» غير معروفة في عمود ${name}.`, name);
      if (current !== undefined && current !== value) return err(row, `${name} مختلف عن أول صف في نفس المستوى (المرحلة ${stage}، المستوى ${order}).`, name);
      set(value);
    };
    levelField("title", c("title"), (v) => (v.length >= 2 && v.length <= 80 ? v : null), lv.title, (v) => (lv.title = v));
    levelField("type", c("type"), parseType, lv.type, (v) => (lv.type = v));
    levelField("difficulty", c("difficulty"), parseDifficulty, lv.difficulty, (v) => (lv.difficulty = v));
    levelField("audience", c("audience"), parseAudience, lv.audience, (v) => (lv.audience = v));

    // Question columns.
    const surah = findSurah(c("surah"));
    if (!surah) {
      err(row, c("surah") ? `السورة «${c("surah")}» غير معروفة.` : "عمود السورة فارغ.", H("surah"));
      continue;
    }
    const allowed = stageSurahs(stage).find((s) => s.surah === surah.number);
    if (!allowed) {
      err(row, `سورة ${surah.name} ليست من سور المرحلة ${stage}.`, H("surah"));
      continue;
    }
    const ayah = toInt(c("ayah"));
    if (ayah !== null) {
      const from = allowed.fromAyah ?? 1;
      const to = allowed.toAyah ?? surah.ayahCount;
      if (Number.isNaN(ayah) || ayah < from || ayah > to) {
        err(row, `رقم الآية ${c("ayah")} خارج نطاق سورة ${surah.name} في هذه المرحلة (${from}–${to}).`, H("ayah"));
        continue;
      }
    }

    const text = normalizeWord(c("word"));
    if (!text) err(row, "عمود الكلمة فارغ.", H("word"));
    else if (!isValidGameWord(text)) err(row, `الكلمة «${c("word")}» يجب أن تكون كلمة عربية واحدة بدون مسافات أو أرقام (2–9 حروف).`, H("word"));
    const hint = c("hint");
    if (hint.length < 3 || hint.length > 140) err(row, hint ? `السؤال/التلميح يجب أن يكون بين 3 و140 حرفًا (الموجود ${hint.length}).` : "عمود السؤال/التلميح فارغ.", H("hint"));
    const fact = c("fact");
    if (fact.length < 3 || fact.length > 280) err(row, fact ? `المعلومة يجب أن تكون بين 3 و280 حرفًا (الموجود ${fact.length}).` : "عمود المعلومة فارغ.", H("fact"));
    const kind = parseKind(c("kind"));
    if (!kind) err(row, c("kind") ? `نوع المعرفة «${c("kind")}» غير معروف.` : "عمود نوع المعرفة فارغ.", H("kind"));
    const quran = c("quran");
    if (quran.length > 500) err(row, "النص القرآني أطول من 500 حرف.", H("quran"));

    if (text && isValidGameWord(text) && kind && hint.length >= 3 && fact.length >= 3) {
      // The same answer twice in one level can't be played (two identical tiles / grid words).
      const twin = group.items.find((i) => i.text === text);
      if (twin) {
        err(row, `الكلمة «${text}» مكررة في نفس المستوى (أول مرة في صف ${twin.row}).`, H("word"));
        continue;
      }
      const sameHint = group.items.find((i) => i.hint === hint);
      if (sameHint) warnings.push({ row, message: `نفس السؤال مكرر في صف ${sameHint.row} من نفس المستوى.`, column: H("hint") });
      group.items.push({ row, text, hint, fact, kind, surahNumber: surah.number, ayah: ayah ?? null, quranText: quran || null });
    }
  }

  currentGroup = null;
  const levels: ParsedLevel[] = [];
  for (const { level, items, hasErrors } of groups.values()) {
    const where = `المرحلة ${level.stage}، المستوى ${level.order}`;
    if (!level.title) err(level.firstRow, `${where}: عنوان المستوى غير موجود (اكتبه في أول صف للمستوى).`, H("title"));
    if (!level.type) err(level.firstRow, `${where}: شكل اللعبة غير موجود (اكتبه في أول صف للمستوى).`, H("type"));
    if (!level.title || !level.type) continue;
    const { min, max } = WORD_LIMITS[level.type];
    // Rows of this level already failed: the count would only repeat those errors.
    if (hasErrors) continue;
    if (items.length < min || items.length > max) {
      err(level.firstRow, `${where}: شكل «${GAME_TYPE_LABEL[level.type].name}» يحتاج من ${min} إلى ${max} أسئلة، والموجود ${items.length}.`);
      continue;
    }
    const surahs = new Set(items.map((i) => i.surahNumber));
    levels.push({
      stage: level.stage,
      order: level.order,
      title: level.title,
      type: level.type,
      difficulty: level.difficulty ?? "EASY",
      audience: level.audience ?? "ALL",
      surahNumber: surahs.size === 1 ? items[0].surahNumber : null,
      items,
      firstRow: level.firstRow,
    });
  }

  levels.sort((a, b) => a.stage - b.stage || a.order - b.order);
  // The same answer in two levels of one stage is allowed, but usually a copy-paste slip.
  const seen = new Map<string, { order: number; row: number }>();
  for (const l of levels)
    for (const i of l.items) {
      const key = `${l.stage}:${i.text}`;
      const first = seen.get(key);
      if (first && first.order !== l.order) warnings.push({ row: i.row, message: `الكلمة «${i.text}» موجودة أيضًا في المستوى ${first.order} من نفس المرحلة (صف ${first.row}).`, column: H("word") });
      else if (!first) seen.set(key, { order: l.order, row: i.row });
    }

  if (rowCount === 0) err(null, "الملف لا يحتوي على أي أسئلة.");
  return { levels, errors, warnings, rowCount };
}
