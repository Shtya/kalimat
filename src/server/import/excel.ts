import "server-only";
import ExcelJS from "exceljs";
import { GAME_TYPE_LABEL, DIFFICULTY_LABEL } from "@/lib/format";
import { CURRICULUM } from "@/lib/quran/curriculum";
import { AUDIENCE_LABEL, KIND_LABEL } from "@/lib/quran/labels";
import { SURAHS } from "@/lib/quran/surahs";
import { db } from "@/lib/db";
import { AUDIENCE_OPTIONS, COLUMNS, DIFFICULTY_OPTIONS, KIND_OPTIONS, QUESTIONS_SHEET, TYPE_OPTIONS, type ColumnKey } from "./columns";
import type { RawRow } from "./parse";

const norm = (v: string) => v.replace(/[ً-ٟ]/g, "").replace(/[()\s]/g, "").replace(/[أإآ]/g, "ا");

/** Plain text of a cell, whatever Excel stored in it (number, rich text, formula result, hyperlink…). */
function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return String(v.result ?? "");
    if ("text" in v) return String(v.text);
    if (v instanceof Date) return v.toISOString();
  }
  return String(v);
}

export type ReadResult = { rows: RawRow[] } | { error: string };

/** Reads the questions sheet (by header names, so column order does not matter). Accepts .xlsx and .csv. */
export async function readSheet(file: File): Promise<ReadResult> {
  const wb = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    if (file.name.toLowerCase().endsWith(".csv")) {
      const { Readable } = await import("node:stream");
      await wb.csv.read(Readable.from(buffer.toString("utf8").replace(/^﻿/, "")));
    } else {
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    return { error: "تعذّرت قراءة الملف. تأكد أنه ملف Excel ‎(.xlsx)‎ أو CSV سليم." };
  }

  const sheet = wb.getWorksheet(QUESTIONS_SHEET) ?? wb.worksheets[0];
  if (!sheet) return { error: "الملف لا يحتوي على أي ورقة." };

  // Find the header row within the first 5 rows.
  let headerRow = 0;
  const map = new Map<number, ColumnKey>();
  for (let r = 1; r <= Math.min(5, sheet.rowCount) && !headerRow; r++) {
    const found = new Map<number, ColumnKey>();
    sheet.getRow(r).eachCell((cell, col) => {
      const h = norm(cellText(cell));
      const column = COLUMNS.find((c) => norm(c.header) === h || c.aliases?.some((a) => norm(a) === h) || c.key === h.toLowerCase());
      if (column) found.set(col, column.key);
    });
    if (found.size >= 5) {
      headerRow = r;
      found.forEach((k, col) => map.set(col, k));
    }
  }
  if (!headerRow) return { error: "لم أجد صف العناوين. استخدم القالب الجاهز من زر «تنزيل القالب» ولا تغيّر أسماء الأعمدة." };
  const missing = COLUMNS.filter((c) => c.required && ![...map.values()].includes(c.key));
  if (missing.length) return { error: `أعمدة ناقصة: ${missing.map((c) => c.header).join("، ")}.` };

  const rows: RawRow[] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: RawRow["cells"] = {};
    map.forEach((key, col) => (cells[key] = cellText(row.getCell(col)).trim()));
    rows.push({ row: r, cells });
  }
  if (rows.length > 5000) return { error: "الملف أكبر من 5000 صف. قسّمه على أكثر من ملف." };
  return { rows };
}

// ───────────── Template / export ─────────────

type ExportRow = Record<ColumnKey, string | number | null>;

function questionsSheet(wb: ExcelJS.Workbook, rows: ExportRow[]) {
  const ws = wb.addWorksheet(QUESTIONS_SHEET, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.height = 28;
  head.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  COLUMNS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.required ? "FF1F6FC5" : "FF6B7A99" } };
    cell.note = c.note;
  });
  rows.forEach((r) => ws.addRow(r));

  // Dropdowns for the fixed-value columns (first 2000 rows).
  const list = (key: ColumnKey, values: string[]) => {
    const col = COLUMNS.findIndex((c) => c.key === key) + 1;
    for (let r = 2; r <= 2000; r++)
      ws.getCell(r, col).dataValidation = { type: "list", allowBlank: true, formulae: [`"${values.join(",")}"`], showErrorMessage: true, error: "اختر قيمة من القائمة" };
  };
  list("type", TYPE_OPTIONS);
  list("difficulty", DIFFICULTY_OPTIONS);
  list("audience", AUDIENCE_OPTIONS);
  list("kind", KIND_OPTIONS);
  ws.getColumn("hint").alignment = { wrapText: true, vertical: "top" };
  ws.getColumn("fact").alignment = { wrapText: true, vertical: "top" };
}

function referenceSheets(wb: ExcelJS.Workbook) {
  const guide = wb.addWorksheet("تعليمات", { views: [{ rightToLeft: true }] });
  guide.columns = [{ width: 26 }, { width: 100 }];
  const lines: [string, string][] = [
    ["كيف يعمل الملف؟", "كل صف = سؤال واحد. الأسئلة التي لها نفس «رقم المرحلة» و«رقم المستوى» تكوّن مستوى لعب واحدًا."],
    ["عند الرفع", "المستوى الموجود بنفس الرقم في نفس المرحلة يتحدّث (وأسئلته تُستبدل بأسئلة الملف)، والمستوى الجديد يُنشأ. المستويات غير الموجودة في الملف لا تتغير."],
    ["عدد الأسئلة", Object.values(GAME_TYPE_LABEL).map((t) => t.name).join(" / ") + " — عجلة الحروف وأكمل الكلمة: 1–12، شبكة الحروف: 2–8، توصيل: 2–6."],
    ["الكلمة", "كلمة واحدة بالرسم الإملائي (مثل: الصلاة، الرحمن). التشكيل وعلامات المصحف تُزال تلقائيًا. لعرض الرسم العثماني استخدم عمود «النص القرآني»."],
    ["", ""],
    ["أعمدة الملف", ""],
    ...COLUMNS.map((c): [string, string] => [c.header + (c.required ? " *" : ""), c.note]),
    ["", ""],
    ["أنواع المعرفة", "تحدد ما يقيسه السؤال، وتظهر في تقارير القياس:"],
    ...Object.values(KIND_LABEL).map((k): [string, string] => [k.name, k.help]),
  ];
  lines.forEach(([a, b]) => {
    const row = guide.addRow([a, b]);
    row.getCell(1).font = { bold: true };
    row.alignment = { wrapText: true, vertical: "top" };
  });
  guide.getRow(1).font = { bold: true, size: 13 };

  const stages = wb.addWorksheet("المراحل والسور", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  stages.columns = [
    { header: "رقم المرحلة", width: 12 },
    { header: "المحطة", width: 40 },
    { header: "المرحلة", width: 44 },
    { header: "السور المسموحة", width: 90 },
  ];
  stages.getRow(1).font = { bold: true };
  for (const st of CURRICULUM)
    for (const stage of st.stages)
      stages.addRow([
        stage.number,
        `${st.order}. ${st.title}`,
        stage.title,
        stage.surahs.map((s) => SURAHS[s.surah - 1].name + (s.fromAyah ? ` (${s.fromAyah}–${s.toAyah})` : "")).join("، "),
      ]).alignment = { wrapText: true, vertical: "top" };
}

/** The empty template with two example levels, guide and reference sheets. */
export async function buildTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "كلمات قرآنية";
  questionsSheet(wb, [
    { stage: 1, level: 1, title: "سورة الفاتحة", type: "عجلة الحروف", difficulty: "سهل", audience: "الكل", surah: "الفاتحة", ayah: 2, word: "الحمد", hint: "الثناء على الله بكل صفات الكمال", fact: "«الحمد لله رب العالمين» هي الآية الثانية من الفاتحة.", kind: "معنى مفردة", quran: null },
    { stage: 1, level: 1, title: null, type: null, difficulty: null, audience: null, surah: "الفاتحة", ayah: 5, word: "نستعين", hint: "«إياك نعبد وإياك ...»", fact: "نعبد الله وحده ونطلب منه العون.", kind: "قيمة وسلوك", quran: null },
    { stage: 1, level: 2, title: "سورة الفيل", type: "توصيل", difficulty: "سهل", audience: "الطفولة", surah: "الفيل", ayah: 3, word: "أبابيل", hint: "طير جاءت جماعات متتابعة", fact: "أبابيل: جماعات كثيرة متتابعة.", kind: "معنى مفردة", quran: null },
    { stage: 1, level: 2, title: null, type: null, difficulty: null, audience: null, surah: "الفيل", ayah: 4, word: "سجيل", hint: "طين متحجّر رمت به الطير", fact: "سجيل: طين متحجر.", kind: "معنى مفردة", quran: null },
  ]);
  referenceSheets(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Current content in the same format, so it can be edited and uploaded again. */
export async function buildExport(stageNumber?: number): Promise<Buffer> {
  const levels = await db.level.findMany({
    where: stageNumber ? { stage: { number: stageNumber } } : {},
    orderBy: [{ stage: { number: "asc" } }, { order: "asc" }],
    include: { stage: { select: { number: true } }, words: { orderBy: { order: "asc" }, include: { surah: { select: { name: true } } } } },
  });
  const rows: ExportRow[] = levels.flatMap((l) =>
    l.words.map((w, i) => ({
      stage: l.stage.number,
      level: l.order,
      title: i === 0 ? l.title : null,
      type: i === 0 ? GAME_TYPE_LABEL[l.type].name : null,
      difficulty: i === 0 ? DIFFICULTY_LABEL[l.difficulty] : null,
      audience: i === 0 ? AUDIENCE_LABEL[l.audience] : null,
      surah: w.surah?.name ?? null,
      ayah: w.ayah,
      word: w.text,
      hint: w.hint,
      fact: w.fact,
      kind: KIND_LABEL[w.kind].name,
      quran: w.quranText,
    })),
  );
  const wb = new ExcelJS.Workbook();
  wb.creator = "كلمات قرآنية";
  questionsSheet(wb, rows);
  referenceSheets(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
