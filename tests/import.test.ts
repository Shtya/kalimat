import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRows, type RawRow } from "../src/server/import/parse";

const base = { stage: "1", level: "1", title: "سورة الفاتحة", type: "عجلة الحروف", surah: "الفاتحة", kind: "معنى مفردة" };
const row = (n: number, cells: RawRow["cells"]): RawRow => ({ row: n, cells });

test("groups rows into levels and takes level fields from the first row", () => {
  const r = parseRows([
    row(2, { ...base, ayah: "2", word: "الْحَمْدُ", hint: "الثناء على الله", fact: "الآية الثانية من الفاتحة." }),
    row(3, { stage: "1", level: "1", surah: "1", ayah: "5", word: "نستعين", hint: "نطلب العون", fact: "نطلب العون من الله.", kind: "قيمة" }),
    row(4, {}),
    row(5, { stage: "١", level: "٢", title: "الفيل", type: "توصيل", audience: "الطفولة", surah: "سورة الفيل", word: "أبابيل", hint: "طير جماعات", fact: "جماعات متتابعة.", kind: "معنى" }),
    row(6, { stage: "1", level: "2", surah: "الفيل", word: "سجيل", hint: "طين متحجر", fact: "طين متحجر.", kind: "معنى" }),
  ]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.rowCount, 4);
  assert.equal(r.levels.length, 2);
  const [a, b] = r.levels;
  assert.equal(a.items[0].text, "الحمد", "harakat removed");
  assert.equal(a.type, "WORD_BUILD");
  assert.equal(a.difficulty, "EASY");
  assert.equal(a.audience, "ALL");
  assert.equal(a.surahNumber, 1);
  assert.equal(a.items[1].kind, "VALUE");
  assert.equal(b.type, "MATCH");
  assert.equal(b.audience, "CHILD");
  assert.equal(b.order, 2);
});

test("rejects surahs outside the stage, bad ayahs, multi-word answers and unknown values", () => {
  const r = parseRows([
    row(2, { ...base, surah: "يوسف", word: "الصبر", hint: "قيمة", fact: "معلومة طويلة." }),
    row(3, { ...base, ayah: "9", word: "الدين", hint: "الجزاء", fact: "يوم الجزاء." }),
    row(4, { ...base, word: "يوم الدين", hint: "الجزاء", fact: "يوم الجزاء." }),
    row(5, { ...base, kind: "حكاية", word: "الدين", hint: "الجزاء", fact: "يوم الجزاء." }),
    row(6, { ...base, stage: "30", word: "الدين", hint: "الجزاء", fact: "يوم الجزاء." }),
  ]);
  const msgs = r.errors.map((e) => `${e.row}: ${e.message}`).join("\n");
  assert.match(msgs, /2: سورة يوسف ليست من سور المرحلة 1/);
  assert.match(msgs, /3: رقم الآية 9 خارج نطاق/);
  assert.match(msgs, /4: الكلمة «يوم الدين»/);
  assert.match(msgs, /5: نوع المعرفة «حكاية» غير معروف/);
  assert.match(msgs, /6: رقم المرحلة/);
});

test("البقرة: ayah must fall in the stage's half", () => {
  const q = { level: "1", title: "البقرة", type: "عجلة", surah: "البقرة", word: "المتقين", hint: "سؤال", fact: "معلومة.", kind: "معنى" };
  assert.equal(parseRows([row(2, { ...q, stage: "21", ayah: "2" })]).errors.length, 0);
  assert.match(parseRows([row(2, { ...q, stage: "21", ayah: "200" })]).errors[0].message, /1–176/);
  assert.equal(parseRows([row(2, { ...q, stage: "22", ayah: "200" })]).errors.length, 0);
});

test("conflicting level fields and word-count limits are errors", () => {
  const q = (n: number, extra: RawRow["cells"]) => row(n, { stage: "1", level: "1", surah: "الفاتحة", word: `كلمة`, hint: "سؤال", fact: "معلومة.", kind: "معنى", ...extra });
  const conflict = parseRows([q(2, { title: "أ ب", type: "توصيل" }), q(3, { type: "شبكة", word: "الدين" })]);
  assert.match(conflict.errors[0].message, /شكل اللعبة مختلف/);
  const tooFew = parseRows([q(2, { title: "مستوى", type: "توصيل" })]);
  assert.match(tooFew.errors[0].message, /توصيل.*من 2 إلى 6/);
});

test("empty file is an error", () => {
  assert.equal(parseRows([row(2, {})]).errors[0].message, "الملف لا يحتوي على أي أسئلة.");
});

test("a level whose rows failed does not also report a question-count error", () => {
  const r = parseRows([
    row(2, { ...base, word: "يوم الدين", hint: "الجزاء", fact: "يوم الجزاء." }),
    row(3, { stage: "1", level: "1", surah: "يوسف", word: "الصبر", hint: "قيمة", fact: "معلومة.", kind: "قيمة" }),
  ]);
  assert.equal(r.errors.length, 2);
  assert.ok(!r.errors.some((e) => /يحتاج من/.test(e.message)));
});
