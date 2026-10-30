// Sample content for stage 1 (الفاتحة + جزء عمّ) — a demo of every game type and question kind.
// Real content is uploaded by the client's team from the dashboard (Excel import).
import type { Difficulty, KnowledgeKind, LevelType } from "@prisma/client";

export type SampleItem = { text: string; hint: string; fact: string; kind: KnowledgeKind; surah: number; ayah: number };
export type SampleLevel = { title: string; type: LevelType; difficulty: Difficulty; surah: number | null; items: SampleItem[] };

export const SAMPLE_STAGE = 1;

export const SAMPLE_LEVELS: SampleLevel[] = [
  {
    title: "سورة الفاتحة",
    type: "WORD_BUILD",
    difficulty: "EASY",
    surah: 1,
    items: [
      { text: "الحمد", hint: "الثناء على الله بكل صفات الكمال، وبه تبدأ الآية الثانية", fact: "«الحمد لله رب العالمين» هي الآية الثانية من سورة الفاتحة.", kind: "MEANING", surah: 1, ayah: 2 },
      { text: "العالمين", hint: "كل المخلوقات، والله ربّها وخالقها", fact: "الله رب العالمين: خالق كل المخلوقات ومدبّر أمرها.", kind: "MEANING", surah: 1, ayah: 2 },
      { text: "الدين", hint: "«مالك يوم ...» ومعناها الجزاء والحساب", fact: "يوم الدين هو يوم القيامة، يوم الجزاء والحساب.", kind: "MEANING", surah: 1, ayah: 4 },
      { text: "نستعين", hint: "«إياك نعبد وإياك ...»: نطلب العون من الله وحده", fact: "في الآية الخامسة نتعلم أن نعبد الله وحده ونطلب منه العون.", kind: "VALUE", surah: 1, ayah: 5 },
      { text: "المستقيم", hint: "صفة الصراط الذي ندعو الله أن يهدينا إليه", fact: "الصراط المستقيم هو طريق الإسلام الواضح الذي لا اعوجاج فيه.", kind: "THEME", surah: 1, ayah: 6 },
    ],
  },
  {
    title: "قصار السور: الإخلاص والكوثر والعصر والفلق",
    type: "MATCH",
    difficulty: "EASY",
    surah: null,
    items: [
      { text: "الصمد", hint: "الذي تقصده المخلوقات في كل حاجاتها", fact: "«الله الصمد» من سورة الإخلاص، وهي تعدل ثلث القرآن.", kind: "MEANING", surah: 112, ayah: 2 },
      { text: "الكوثر", hint: "نهر في الجنة أعطاه الله للنبي ﷺ", fact: "سورة الكوثر من أقصر سور القرآن، وآياتها ثلاث.", kind: "MEANING", surah: 108, ayah: 1 },
      { text: "الصبر", hint: "ما يوصي به المؤمنون بعضهم مع الحق في سورة العصر", fact: "«وتواصوا بالحق وتواصوا بالصبر»: النجاة إيمان وعمل وتناصح.", kind: "VALUE", surah: 103, ayah: 3 },
      { text: "الفلق", hint: "الصبح الذي ينشق عنه ظلام الليل", fact: "نقرأ المعوذتين (الفلق والناس) لنحتمي بالله من كل شر.", kind: "MEANING", surah: 113, ayah: 1 },
    ],
  },
  {
    title: "سورتا الفيل وقريش",
    type: "WORD_SEARCH",
    difficulty: "EASY",
    surah: null,
    items: [
      { text: "الفيل", hint: "الحيوان الضخم الذي جاء به أبرهة لهدم الكعبة", fact: "حمى الله الكعبة من جيش أبرهة في العام الذي وُلد فيه النبي ﷺ.", kind: "STORY", surah: 105, ayah: 1 },
      { text: "أبابيل", hint: "طير جاءت جماعات متتابعة على جيش أبرهة", fact: "«وأرسل عليهم طيرًا أبابيل» أي جماعات كثيرة متتابعة.", kind: "MEANING", surah: 105, ayah: 3 },
      { text: "سجيل", hint: "طين متحجّر رمت به الطير جيش الفيل", fact: "«ترميهم بحجارة من سجيل» أي من طين متحجر.", kind: "MEANING", surah: 105, ayah: 4 },
      { text: "الشتاء", hint: "فصل رحلة قريش التجارية إلى اليمن", fact: "كانت لقريش رحلتان آمنتان: إلى اليمن شتاءً وإلى الشام صيفًا.", kind: "STORY", surah: 106, ayah: 2 },
      { text: "البيت", hint: "«فليعبدوا رب هذا ...»", fact: "البيت هو الكعبة المشرفة، وأمرهم الله أن يعبدوه شكرًا على الأمن والرزق.", kind: "THEME", surah: 106, ayah: 3 },
    ],
  },
  {
    title: "سورة الماعون",
    type: "MISSING_LETTER",
    difficulty: "EASY",
    surah: 107,
    items: [
      { text: "اليتيم", hint: "من يدفعه المكذّب بالدين بقسوة", fact: "الإحسان إلى اليتيم من علامات الإيمان الصادق.", kind: "VALUE", surah: 107, ayah: 2 },
      { text: "المسكين", hint: "من لا يحثّ المكذّب على إطعامه", fact: "الحث على إطعام المسكين خلق يحبه الله.", kind: "VALUE", surah: 107, ayah: 3 },
      { text: "يراءون", hint: "يفعلون الخير ليراهم الناس لا لله", fact: "الإخلاص أن نعمل الخير لله وحده، لا ليرانا الناس.", kind: "VALUE", surah: 107, ayah: 6 },
      { text: "الماعون", hint: "الأشياء البسيطة النافعة التي يمنعها البخيل عن الناس", fact: "سُمّيت السورة بالماعون: كل ما ينتفع به الناس من الأشياء البسيطة.", kind: "MEANING", surah: 107, ayah: 7 },
    ],
  },
  {
    title: "سورتا النصر والمسد",
    type: "WORD_BUILD",
    difficulty: "MEDIUM",
    surah: null,
    items: [
      { text: "أفواجا", hint: "جماعات كثيرة دخلت في دين الله", fact: "«ورأيت الناس يدخلون في دين الله أفواجًا».", kind: "MEANING", surah: 110, ayah: 2 },
      { text: "استغفره", hint: "ماذا أُمر النبي ﷺ أن يفعل مع التسبيح عند النصر؟", fact: "عند النجاح نشكر الله ونستغفره ولا نغترّ.", kind: "VALUE", surah: 110, ayah: 3 },
      { text: "لهب", hint: "كنية عمّ النبي ﷺ الذي عادى الدعوة: أبو ...", fact: "أبو لهب عمّ النبي ﷺ، ونزلت فيه سورة المسد.", kind: "STORY", surah: 111, ayah: 1 },
      { text: "الحطب", hint: "وُصفت امرأة أبي لهب بأنها «حمّالة ...»", fact: "كانت تؤذي النبي ﷺ، فذكر القرآن عاقبتها.", kind: "STORY", surah: 111, ayah: 4 },
    ],
  },
  {
    title: "سورة النبأ",
    type: "MATCH",
    difficulty: "MEDIUM",
    surah: 78,
    items: [
      { text: "العظيم", hint: "وصف الخبر الذي يتساءل عنه المكذبون في أول السورة", fact: "النبأ العظيم هو خبر البعث ويوم القيامة.", kind: "THEME", surah: 78, ayah: 2 },
      { text: "أوتادا", hint: "شبّه الله بها الجبال التي تثبّت الأرض", fact: "«والجبال أوتادًا»: الجبال تثبّت الأرض كما تثبّت الأوتادُ الخيمة.", kind: "MEANING", surah: 78, ayah: 7 },
      { text: "سباتا", hint: "جعل الله نومنا راحةً وقطعًا للتعب", fact: "«وجعلنا نومكم سباتًا» أي راحة لأبدانكم.", kind: "MEANING", surah: 78, ayah: 9 },
      { text: "معاشا", hint: "جعل الله النهار وقتًا لطلب الرزق والعمل", fact: "«وجعلنا النهار معاشًا»: النهار للسعي والعمل.", kind: "MEANING", surah: 78, ayah: 11 },
    ],
  },
];

