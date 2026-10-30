// Arabic labels for the curriculum enums, plus lenient parsers for values typed in the Excel sheet.

export const TRACKS = ["CHILD", "YOUTH"] as const;
export type Track = (typeof TRACKS)[number];
export const TRACK_LABEL: Record<Track, { name: string; ages: string; icon: string }> = {
  CHILD: { name: "الطفولة", ages: "من ٧ إلى ١١ سنة", icon: "🌱" },
  YOUTH: { name: "النشء والشباب", ages: "من ١٢ إلى ١٨ سنة", icon: "🌳" },
};

export const AUDIENCES = ["ALL", "CHILD", "YOUTH"] as const;
export type AudienceValue = (typeof AUDIENCES)[number];
export const AUDIENCE_LABEL: Record<AudienceValue, string> = { ALL: "الكل", CHILD: "الطفولة", YOUTH: "النشء" };

export const KINDS = ["MEANING", "STORY", "VALUE", "THEME", "FACT"] as const;
export type Kind = (typeof KINDS)[number];
/** What each question kind measures — shown in the template, the dashboard and the reports. */
export const KIND_LABEL: Record<Kind, { name: string; icon: string; help: string }> = {
  MEANING: { name: "معنى مفردة", icon: "📖", help: "يعرف معنى كلمة قرآنية (غريب القرآن)." },
  STORY: { name: "قصة وشخصيات", icon: "🐘", help: "يعرف أحداث القصص وأسماء الأنبياء والأقوام في السورة." },
  VALUE: { name: "قيمة وسلوك", icon: "💎", help: "يعرف القيمة أو الخلق الذي تعلّمه الآية (من العنقود القيمي)." },
  THEME: { name: "مقصد السورة", icon: "🎯", help: "يعرف موضوع السورة ورسالتها الرئيسية." },
  FACT: { name: "معلومة عن السورة", icon: "ℹ️", help: "اسم السورة، عدد آياتها، مكان نزولها، أو معلومة عامة عنها." },
};

const clean = (v: string) => v.replace(/[ً-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();

function lookup<T extends string>(table: Record<string, T>, value: string): T | null {
  const v = clean(value);
  if (!v) return null;
  for (const [key, out] of Object.entries(table)) if (clean(key) === v) return out;
  return null;
}

export const parseType = (v: string) =>
  lookup(
    {
      "عجلة الحروف": "WORD_BUILD", عجلة: "WORD_BUILD", دائرة: "WORD_BUILD", WORD_BUILD: "WORD_BUILD",
      "شبكة الحروف": "WORD_SEARCH", شبكة: "WORD_SEARCH", مربع: "WORD_SEARCH", WORD_SEARCH: "WORD_SEARCH",
      توصيل: "MATCH", وصل: "MATCH", MATCH: "MATCH",
      "أكمل الكلمة": "MISSING_LETTER", أكمل: "MISSING_LETTER", "الحرف الناقص": "MISSING_LETTER", MISSING_LETTER: "MISSING_LETTER",
    } as const,
    v,
  );

export const parseDifficulty = (v: string) =>
  lookup({ سهل: "EASY", متوسط: "MEDIUM", صعب: "HARD", EASY: "EASY", MEDIUM: "MEDIUM", HARD: "HARD" } as const, v);

export const parseAudience = (v: string) =>
  lookup(
    { الكل: "ALL", الجميع: "ALL", ALL: "ALL", الطفوله: "CHILD", اطفال: "CHILD", طفوله: "CHILD", CHILD: "CHILD", النشء: "YOUTH", نشء: "YOUTH", "النشء والشباب": "YOUTH", شباب: "YOUTH", YOUTH: "YOUTH" } as const,
    v,
  );

export const parseKind = (v: string) =>
  lookup(
    {
      "معنى مفردة": "MEANING", معنى: "MEANING", مفردة: "MEANING", MEANING: "MEANING",
      "قصة وشخصيات": "STORY", قصة: "STORY", شخصيات: "STORY", STORY: "STORY",
      "قيمة وسلوك": "VALUE", قيمة: "VALUE", سلوك: "VALUE", VALUE: "VALUE",
      "مقصد السورة": "THEME", مقصد: "THEME", موضوع: "THEME", THEME: "THEME",
      "معلومة عن السورة": "FACT", معلومة: "FACT", FACT: "FACT",
    } as const,
    v,
  );
