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

test("duplicates: same answer twice in a level is an error; same question or answer elsewhere only warns", () => {
  const q = (n: number, extra: RawRow["cells"]) => row(n, { ...base, hint: `سؤال ${n}`, fact: "معلومة.", ...extra });
  const dup = parseRows([q(2, { word: "الدين" }), q(3, { word: "الدِّين" })]);
  assert.equal(dup.errors.length, 1);
  assert.match(dup.errors[0].message, /مكررة في نفس المستوى \(أول مرة في صف 2\)/);
  assert.equal(dup.errors[0].row, 3);
  assert.equal(dup.errors[0].column, "الكلمة (الإجابة)");
  assert.ok(!dup.errors.some((e) => /يحتاج من/.test(e.message)), "no extra count error for the failed level");

  const sameHint = parseRows([q(2, { word: "الدين", hint: "نفس السؤال" }), q(3, { word: "الحمد", hint: "نفس السؤال" })]);
  assert.deepEqual(sameHint.errors, []);
  assert.match(sameHint.warnings[0].message, /نفس السؤال مكرر في صف 2/);

  const twoLevels = parseRows([q(2, { word: "الدين" }), q(3, { level: "2", title: "ثاني", word: "الدين" })]);
  assert.deepEqual(twoLevels.errors, []);
  assert.match(twoLevels.warnings[0].message, /موجودة أيضًا في المستوى 1/);
});

test("every row error names its column", () => {
  const r = parseRows([
    row(2, { ...base, stage: "x", word: "الدين", hint: "سؤال", fact: "معلومة." }),
    row(3, { ...base, kind: "", word: "الدين", hint: "سؤال", fact: "معلومة." }),
    row(4, { ...base, word: "الدين", hint: "", fact: "معلومة." }),
  ]);
  assert.deepEqual(
    r.errors.map((e) => e.column),
    ["رقم المرحلة", "نوع المعرفة", "السؤال / التلميح"],
  );
  assert.match(r.errors[0].message, /«x»/);
  assert.match(r.errors[2].message, /فارغ/);
});
