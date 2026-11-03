const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

export function timeAgo(date: Date | string): string {
  let value = (new Date(date).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return rtf.format(Math.round(value), "year");
}

export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} د ${s} ث` : `${s} ث`;
}

export const DIFFICULTY_LABEL = { EASY: "سهل", MEDIUM: "متوسط", HARD: "صعب" } as const;
export const GAME_TYPE_LABEL = {
  WORD_BUILD: { name: "عجلة الحروف", icon: "🎡", help: "يكوّن الطالب كل كلمة من حروف مرتبة على دائرة (سحب أو ضغط)." },
  WORD_SEARCH: { name: "شبكة الحروف", icon: "🔠", help: "كل كلمات المرحلة مخفية داخل مربع حروف، والطالب يبحث عنها ويسحب فوقها." },
  MATCH: { name: "توصيل", icon: "🔗", help: "يصل الطالب كل كلمة بمعناها (التلميح). من ٢ إلى ٦ كلمات." },
  MISSING_LETTER: { name: "أكمل الكلمة", icon: "🧩", help: "تظهر الكلمة ناقصة حرفًا أو أكثر، ويختار الطالب الحرف الصحيح." },
} as const;
export const STATUS_LABEL = { DRAFT: "مسودة", PUBLISHED: "منشور" } as const;
/** Arabic counted noun: 1 طالب واحد · 2 طالبان · 3–10 طلاب · 11+ طالبًا. */
export function count(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return `${one} واحد`;
  if (n === 2) return two;
  return `${n} ${n % 100 >= 3 && n % 100 <= 10 ? few : many}`;
}
export const STUDENTS: [string, string, string, string] = ["طالب", "طالبان", "طلاب", "طالبًا"];
export const QUESTIONS: [string, string, string, string] = ["سؤال", "سؤالان", "أسئلة", "سؤالًا"];
export const ANSWERS: [string, string, string, string] = ["إجابة", "إجابتان", "إجابات", "إجابة"];

export const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
