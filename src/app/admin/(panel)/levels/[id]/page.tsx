import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Dropdown } from "@/components/admin/Dropdown";
import { EmptyState, PageHead } from "@/components/admin/ui";
import { Icon } from "@/components/play/Icon";
import { db } from "@/lib/db";
import { GAME_TYPE_LABEL, STATUS_LABEL } from "@/lib/format";
import { WORD_LIMITS } from "@/lib/scoring";
import { KIND_LABEL, KINDS } from "@/lib/quran/labels";
import { deleteLevel, deleteWord, saveLevel, saveWord } from "../../../actions";
import { LevelFields } from "../LevelFields";

export const metadata = { title: "تعديل مستوى" };

type W = { text: string; hint: string; fact: string; order: number; kind: string; surahNumber: number | null; ayah: number | null; quranText: string | null };

function WordFields({ w, order, surahs, defaultSurah }: { w?: W; order: number; surahs: { number: number; name: string }[]; defaultSurah?: number | null }) {
  const surah = w ? w.surahNumber : defaultSurah;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="form-row">
        <label className="fld">
          الكلمة (الإجابة)
          <input name="text" defaultValue={w?.text} required maxLength={20} placeholder="مثلًا: الصمد" />
        </label>
        <label className="fld">
          السؤال / التلميح
          <textarea name="hint" defaultValue={w?.hint} required minLength={3} maxLength={140} />
        </label>
        <label className="fld">
          المعلومة (تظهر بعد الحل)
          <textarea name="fact" defaultValue={w?.fact} required minLength={3} maxLength={280} />
        </label>
      </div>
      <div className="form-row">
        <div className="fld">
          نوع المعرفة
          <Dropdown name="kind" defaultValue={w?.kind ?? "MEANING"} options={KINDS.map((k) => ({ value: k, label: `${KIND_LABEL[k].icon} ${KIND_LABEL[k].name}` }))} />
        </div>
        <div className="fld">
          السورة
          <Dropdown
            name="surahNumber"
            defaultValue={surah ? String(surah) : ""}
            options={[{ value: "", label: "—" }, ...surahs.map((s) => ({ value: String(s.number), label: s.name }))]}
          />
        </div>
        <label className="fld">
          رقم الآية
          <input name="ayah" type="number" min={1} max={286} defaultValue={w?.ayah ?? ""} />
        </label>
        <label className="fld">
          الترتيب
          <input name="order" type="number" min={0} defaultValue={w?.order ?? order} required />
        </label>
      </div>
      <label className="fld">
        النص القرآني (اختياري، بالرسم العثماني)
        <input name="quranText" defaultValue={w?.quranText ?? ""} maxLength={500} />
      </label>
      <div className="actions">
        <SubmitButton>{w ? "حفظ" : "إضافة"}</SubmitButton>
      </div>
    </div>
  );
}

export default async function LevelEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const level = await db.level.findUnique({
    where: { id },
    include: {
      words: { orderBy: { order: "asc" } },
      stage: {
        select: {
          id: true,
          number: true,
          title: true,
          station: { select: { order: true, title: true } },
          surahs: { orderBy: { order: "asc" }, select: { surah: { select: { number: true, name: true } } } },
        },
      },
      _count: { select: { progress: true } },
    },
  });
  if (!level) notFound();
  const surahs = level.stage.surahs.map((s) => s.surah);
  const limits = WORD_LIMITS[level.type];

  return (
    <>
      <nav className="crumbs" aria-label="المسار">
        <Link href="/admin/content">المنهج والأسئلة</Link>/
        <Link href={`/admin/content?stage=${level.stage.id}`}>
          المرحلة {level.stage.number}: {level.stage.title}
        </Link>
        /<span>{level.title}</span>
      </nav>
      <PageHead
        kicker={`المستوى ${level.order} · ${GAME_TYPE_LABEL[level.type].icon} ${GAME_TYPE_LABEL[level.type].name}`}
        title={
          <>
            {level.title} <span className={`badge badge-${level.status}`}>{STATUS_LABEL[level.status]}</span>
          </>
        }
        actions={
          <>
            <Link href={`/admin/content?stage=${level.stage.id}`} className="abtn abtn-light">
              <Icon name="forward" size={17} /> رجوع للمرحلة
            </Link>
            <Link href={`/admin/levels/${level.id}/preview`} className="abtn abtn-light">
              <Icon name="eye" size={17} /> معاينة كما يراها الطالب
            </Link>
          </>
        }
      >
        {level.words.length} من {limits.min}–{limits.max} أسئلة يحتاجها هذا الشكل · لعبه {level._count.progress} طالب. عدّل البيانات أو الأسئلة، ثم غيّر الحالة إلى «منشور» ليظهر للطلاب.
      </PageHead>

      <section className="panel">
        <h2>بيانات المستوى</h2>
        <ActionForm action={saveLevel.bind(null, level.id)}>
          <input type="hidden" name="stageId" value={level.stageId} />
          <LevelFields l={level} surahs={surahs} />
        </ActionForm>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>الأسئلة ({level.words.length})</h2>
            <p>كل سؤال = كلمة يكوّنها الطالب + تلميح يقرؤه + معلومة تظهر بعد الحل.</p>
          </div>
        </div>
        {level.words.length === 0 && (
          <EmptyState icon="book" title="لا توجد أسئلة في هذا المستوى">
            أضف أول سؤال من النموذج بالأسفل، أو ارفع أسئلة المرحلة كلها من ملف Excel.
          </EmptyState>
        )}
        {level.words.map((w, i) => (
          <div key={w.id} className="word-card">
            <span className="word-num">سؤال {i + 1}</span>
            <ActionForm action={saveWord.bind(null, w.id)}>
              <input type="hidden" name="levelId" value={level.id} />
              <WordFields w={w} order={w.order} surahs={surahs} />
            </ActionForm>
            <ActionForm action={deleteWord.bind(null, w.id)} confirm={`حذف سؤال "${w.text}"؟`} className="actions">
              <SubmitButton className="abtn abtn-danger abtn-sm">حذف السؤال</SubmitButton>
            </ActionForm>
          </div>
        ))}
        <div className="word-card" style={{ background: "#fffaf0", borderStyle: "dashed" }}>
          <b style={{ display: "block", marginBottom: 8 }}>+ سؤال جديد</b>
          <ActionForm action={saveWord.bind(null, null)} resetOnSuccess>
            <input type="hidden" name="levelId" value={level.id} />
            <WordFields order={level.words.length + 1} surahs={surahs} defaultSurah={level.surahNumber} />
          </ActionForm>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          الكلمة: كلمة عربية واحدة بالرسم الإملائي بدون مسافات (٢–٩ حروف). التشكيل وعلامات المصحف تُزال تلقائيًا.
        </p>
      </section>

      <section className="panel danger-zone">
        <div>
          <h2>حذف المستوى</h2>
          <p>يحذف المستوى وكل أسئلته وتقدم الطلاب فيه. لا يمكن التراجع.</p>
        </div>
        <ActionForm action={deleteLevel.bind(null, level.id, level.stage.id)} confirm="حذف المستوى وكل أسئلته وتقدم الطلاب فيه؟">
          <SubmitButton className="abtn abtn-danger">حذف المستوى</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
