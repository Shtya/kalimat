// The 114 surahs: [name, ayah count] in mushaf order (index + 1 = surah number).
const SURAH_DATA: [string, number][] = [
  ["الفاتحة", 7], ["البقرة", 286], ["آل عمران", 200], ["النساء", 176], ["المائدة", 120], ["الأنعام", 165],
  ["الأعراف", 206], ["الأنفال", 75], ["التوبة", 129], ["يونس", 109], ["هود", 123], ["يوسف", 111],
  ["الرعد", 43], ["إبراهيم", 52], ["الحجر", 99], ["النحل", 128], ["الإسراء", 111], ["الكهف", 110],
  ["مريم", 98], ["طه", 135], ["الأنبياء", 112], ["الحج", 78], ["المؤمنون", 118], ["النور", 64],
  ["الفرقان", 77], ["الشعراء", 227], ["النمل", 93], ["القصص", 88], ["العنكبوت", 69], ["الروم", 60],
  ["لقمان", 34], ["السجدة", 30], ["الأحزاب", 73], ["سبأ", 54], ["فاطر", 45], ["يس", 83],
  ["الصافات", 182], ["ص", 88], ["الزمر", 75], ["غافر", 85], ["فصلت", 54], ["الشورى", 53],
  ["الزخرف", 89], ["الدخان", 59], ["الجاثية", 37], ["الأحقاف", 35], ["محمد", 38], ["الفتح", 29],
  ["الحجرات", 18], ["ق", 45], ["الذاريات", 60], ["الطور", 49], ["النجم", 62], ["القمر", 55],
  ["الرحمن", 78], ["الواقعة", 96], ["الحديد", 29], ["المجادلة", 22], ["الحشر", 24], ["الممتحنة", 13],
  ["الصف", 14], ["الجمعة", 11], ["المنافقون", 11], ["التغابن", 18], ["الطلاق", 12], ["التحريم", 12],
  ["الملك", 30], ["القلم", 52], ["الحاقة", 52], ["المعارج", 44], ["نوح", 28], ["الجن", 28],
  ["المزمل", 20], ["المدثر", 56], ["القيامة", 40], ["الإنسان", 31], ["المرسلات", 50], ["النبأ", 40],
  ["النازعات", 46], ["عبس", 42], ["التكوير", 29], ["الانفطار", 19], ["المطففين", 36], ["الانشقاق", 25],
  ["البروج", 22], ["الطارق", 17], ["الأعلى", 19], ["الغاشية", 26], ["الفجر", 30], ["البلد", 20],
  ["الشمس", 15], ["الليل", 21], ["الضحى", 11], ["الشرح", 8], ["التين", 8], ["العلق", 19],
  ["القدر", 5], ["البينة", 8], ["الزلزلة", 8], ["العاديات", 11], ["القارعة", 11], ["التكاثر", 8],
  ["العصر", 3], ["الهمزة", 9], ["الفيل", 5], ["قريش", 4], ["الماعون", 7], ["الكوثر", 3],
  ["الكافرون", 6], ["النصر", 3], ["المسد", 5], ["الإخلاص", 4], ["الفلق", 5], ["الناس", 6],
];

export type SurahInfo = { number: number; name: string; ayahCount: number };

export const SURAHS: SurahInfo[] = SURAH_DATA.map(([name, ayahCount], i) => ({ number: i + 1, name, ayahCount }));

/** Loose form of a surah name for matching typed input: no "سورة", no harakat, unified alef/yaa/taa marbuta. */
export function normalizeSurahName(input: string): string {
  return input
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/^\s*سور[ةه]\s+/, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

const byName = new Map<string, SurahInfo>();
for (const s of SURAHS) {
  const n = normalizeSurahName(s.name);
  byName.set(n, s);
  byName.set(n.replace(/^ال/, ""), s); // "نبأ" → النبأ
}
// Common alternative names.
const ALIASES: Record<string, number> = { "الانشراح": 94, "الدهر": 76, "المجادله": 58, "غافر": 40, "المؤمن": 40, "تبارك": 67, "عم": 78, "حم السجده": 41, "بني اسرائيل": 17, "براءه": 9, "الاخلاص": 112 };
for (const [alias, number] of Object.entries(ALIASES)) byName.set(normalizeSurahName(alias), SURAHS[number - 1]);

/** Finds a surah by number ("12", "١٢") or by name ("يوسف", "سورة يوسف"). */
export function findSurah(input: string | number | null | undefined): SurahInfo | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (/^\d+$/.test(raw)) return SURAHS[Number(raw) - 1] ?? null;
  const n = normalizeSurahName(raw);
  return byName.get(n) ?? byName.get(n.replace(/^ال/, "")) ?? null;
}
