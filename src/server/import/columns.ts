// The Excel sheet layout. One row = one question; the level columns repeat on every row of that level.

export type ColumnKey = "stage" | "level" | "title" | "type" | "difficulty" | "audience" | "surah" | "ayah" | "word" | "hint" | "fact" | "kind" | "quran";

export type Column = { key: ColumnKey; header: string; width: number; required: boolean; note: string; aliases?: string[] };

export const COLUMNS: Column[] = [
  { key: "stage", header: "رقم المرحلة", width: 12, required: true, note: "من 1 إلى 24 (انظر ورقة «المراحل والسور»)." },
  { key: "level", header: "رقم المستوى", width: 12, required: true, note: "ترتيب المستوى داخل المرحلة: 1، 2، 3… كل الأسئلة بنفس الرقم تكوّن مستوى واحدًا." },
  { key: "title", header: "عنوان المستوى", width: 28, required: true, note: "يكفي كتابته في أول صف للمستوى." },
  { key: "type", header: "شكل اللعبة", width: 16, required: true, note: "عجلة الحروف / شبكة الحروف / توصيل / أكمل الكلمة. يكفي في أول صف للمستوى." },
  { key: "difficulty", header: "الصعوبة", width: 10, required: false, note: "سهل / متوسط / صعب (الافتراضي: سهل)." },
  { key: "audience", header: "المسار", width: 12, required: false, note: "الكل / الطفولة / النشء (الافتراضي: الكل)." },
  { key: "surah", header: "السورة", width: 14, required: true, note: "اسم السورة أو رقمها، ويجب أن تكون من سور المرحلة." },
  { key: "ayah", header: "رقم الآية", width: 10, required: false, note: "اختياري، يظهر للطالب مع المعلومة." },
  { key: "word", header: "الكلمة (الإجابة)", width: 18, required: true, note: "كلمة واحدة بالرسم الإملائي، بدون مسافات، من 2 إلى 9 حروف. التشكيل يُزال تلقائيًا." },
  { key: "hint", header: "السؤال / التلميح", width: 44, required: true, note: "ما يقرؤه الطالب ليعرف الكلمة (3–140 حرفًا)." },
  { key: "fact", header: "المعلومة بعد الحل", width: 48, required: true, note: "تظهر في بطاقة «هل تعلم؟» بعد الحل (3–280 حرفًا)." },
  { key: "kind", header: "نوع المعرفة", width: 16, required: true, note: "معنى مفردة / قصة وشخصيات / قيمة وسلوك / مقصد السورة / معلومة عن السورة." },
  { key: "quran", header: "النص القرآني (اختياري)", width: 36, required: false, note: "الآية أو جزء منها بالرسم العثماني، تُعرض كما هي.", aliases: ["النص القرآني"] },
];

export const TYPE_OPTIONS = ["عجلة الحروف", "شبكة الحروف", "توصيل", "أكمل الكلمة"];
export const DIFFICULTY_OPTIONS = ["سهل", "متوسط", "صعب"];
export const AUDIENCE_OPTIONS = ["الكل", "الطفولة", "النشء"];
export const KIND_OPTIONS = ["معنى مفردة", "قصة وشخصيات", "قيمة وسلوك", "مقصد السورة", "معلومة عن السورة"];

export const QUESTIONS_SHEET = "الأسئلة";
