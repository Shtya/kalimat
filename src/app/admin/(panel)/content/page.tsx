import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Drawer, EmptyState, PageHead } from "@/components/admin/ui";
import { Icon } from "@/components/play/Icon";
import { db } from "@/lib/db";
import { DIFFICULTY_LABEL, GAME_TYPE_LABEL, STATUS_LABEL } from "@/lib/format";
import { AUDIENCE_LABEL } from "@/lib/quran/labels";
import { WORD_LIMITS } from "@/lib/scoring";
import { saveLevel, saveStage, saveStation } from "../../actions";
import { ImportForm } from "../import/ImportForm";
import { LevelFields } from "../levels/LevelFields";

export const metadata = { title: "المنهج والأسئلة" };

type Panel = "import" | "stage" | "station" | "new-level";
const PANELS: Panel[] = ["import", "stage", "station", "new-level"];

/** Curriculum + levels + Excel in one place: pick a stage on the side, work on it in the middle. */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ stage?: string; panel?: string; station?: string }> }) {
  const sp = await searchParams;
  const stations = await db.station.findMany({
    orderBy: { order: "asc" },
    include: {
      stages: {
        orderBy: { number: "asc" },
        include: {
          surahs: { orderBy: { order: "asc" }, include: { surah: { select: { number: true, name: true } } } },
          levels: { select: { status: true, _count: { select: { words: true } } } },
        },
      },
    },
  });
  const allStages = stations.flatMap((s) => s.stages);
  // Default: the first stage that still needs content, so a new teacher lands where the work is.
  const stage = allStages.find((s) => s.id === sp.stage || String(s.number) === sp.stage) ?? allStages.find((s) => s.levels.length === 0) ?? allStages[0];
  const station = stations.find((s) => s.stages.some((st) => st.id === stage?.id));
  const panel = PANELS.includes(sp.panel as Panel) ? (sp.panel as Panel) : null;
  const editStation = panel === "station" ? (stations.find((s) => s.id === sp.station) ?? station) : null;

  const levels = stage
    ? await db.level.findMany({
        where: { stageId: stage.id },
        orderBy: { order: "asc" },
        include: { surah: { select: { name: true } }, _count: { select: { words: true, progress: true } } },
      })
    : [];

  const here = (extra: Record<string, string> = {}) => `/admin/content?${new URLSearchParams({ ...(stage ? { stage: stage.id } : {}), ...extra })}`;
  const close = here();
  const totals = {
    levels: allStages.reduce((n, s) => n + s.levels.length, 0),
    questions: allStages.reduce((n, s) => n + s.levels.reduce((m, l) => m + l._count.words, 0), 0),
    ready: allStages.filter((s) => s.levels.some((l) => l.status === "PUBLISHED")).length,
  };

  return (
    <>
      <PageHead
        kicker="المحتوى"
        title="المنهج والأسئلة"
        actions={
          <>
            <Link href={here({ panel: "import" })} className="abtn" scroll={false}>
              <Icon name="upload" size={18} /> استيراد Excel
            </Link>
            <details className="menu">
              <summary className="abtn abtn-light">
                <Icon name="download" size={18} /> تصدير
              </summary>
              <div className="menu-pop">
                {stage && (
                  <a href={`/admin/files/export?stage=${stage.number}`}>
                    <b>أسئلة المرحلة {stage.number}</b>
                    <small>{stage.title}</small>
                  </a>
                )}
                <a href="/admin/files/export">
                  <b>كل الأسئلة</b>
                  <small>
                    {totals.questions} سؤال في {totals.levels} مستوى
                  </small>
                </a>
              </div>
            </details>
          </>
        }
      >
        6 محطات × 4 مراحل تغطي سور القرآن الـ114، والطالب يمشي فيها بالترتيب. اختر مرحلة من القائمة لترى مستوياتها وأسئلتها، أو ارفع ملف Excel بأسئلة عدة مراحل مرة واحدة. ({totals.ready} من {allStages.length} مرحلة
        جاهزة للطلاب)
      </PageHead>

      <div className="content-layout">
        <nav className="tree" aria-label="محطات ومراحل المنهج">
          {stations.map((st) => (
            <section key={st.id} className="tree-station" style={{ "--c": st.color } as React.CSSProperties}>
              <header>
                <span className="tree-icon" aria-hidden>
                  {st.icon}
                </span>
                <span className="tree-station-text">
                  <small>المحطة {st.order}</small>
                  <b>{st.title}</b>
                </span>
                <Link href={here({ panel: "station", station: st.id })} className="icon-btn" aria-label={`تعديل المحطة ${st.order}`} title="تعديل المحطة" scroll={false}>
                  <Icon name="edit" size={16} />
                </Link>
              </header>
              <ol>
                {st.stages.map((s) => {
                  const published = s.levels.filter((l) => l.status === "PUBLISHED").length;
                  const state = s.levels.length === 0 ? "empty" : published === 0 || s.status === "DRAFT" ? "draft" : "ready";
                  return (
                    <li key={s.id}>
                      <Link href={`/admin/content?stage=${s.id}`} className={`tree-stage is-${state}`} aria-current={s.id === stage?.id ? "page" : undefined}>
                        <span className="tree-num">{s.number}</span>
                        <span className="tree-title">{s.title}</span>
                        <span className="tree-count" title={state === "empty" ? "لا توجد مستويات" : `${s.levels.length} مستوى`}>
                          {s.levels.length || "—"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p className="tree-legend">
            <span className="is-ready">جاهزة</span>
            <span className="is-draft">مسودة</span>
            <span className="is-empty">بلا مستويات</span>
          </p>
        </nav>

        {stage && station && (
          <div className="workspace" style={{ "--c": station.color } as React.CSSProperties}>
            <section className="stage-hero">
              <div className="stage-hero-top">
                <div>
                  <span className="page-kicker">
                    {station.icon} المحطة {station.order}: {station.title}
                  </span>
                  <h2>
                    المرحلة {stage.number}: {stage.title} <span className={`badge badge-${stage.status}`}>{STATUS_LABEL[stage.status]}</span>
                  </h2>
                </div>
                <div className="actions">
                  <Link href={here({ panel: "stage" })} className="abtn abtn-light" scroll={false}>
                    <Icon name="edit" size={17} /> تعديل المرحلة
                  </Link>
                  <Link href={here({ panel: "new-level" })} className="abtn" scroll={false}>
                    <Icon name="plus" size={17} /> مستوى جديد
                  </Link>
                </div>
              </div>
              <div className="stage-facts">
                <div>
                  <small>السور ({stage.surahs.length})</small>
                  <SurahChips surahs={stage.surahs} />
                </div>
                <div>
                  <small>العنقود القيمي</small>
                  <p>{stage.valueCluster}</p>
                </div>
              </div>
              <dl className="mini-stats">
                <div>
                  <dt>مستويات</dt>
                  <dd>{levels.length}</dd>
                </div>
                <div>
                  <dt>منشورة</dt>
                  <dd>{levels.filter((l) => l.status === "PUBLISHED").length}</dd>
                </div>
                <div>
                  <dt>أسئلة</dt>
                  <dd>{levels.reduce((n, l) => n + l._count.words, 0)}</dd>
                </div>
                <div>
                  <dt>مرات اللعب</dt>
                  <dd>{levels.reduce((n, l) => n + l._count.progress, 0)}</dd>
                </div>
              </dl>
            </section>

            {levels.length === 0 ? (
              <EmptyState
                icon="layers"
                title="لا توجد مستويات في هذه المرحلة بعد"
                action={
                  <>
                    <Link href={here({ panel: "import" })} className="abtn" scroll={false}>
                      <Icon name="upload" size={17} /> استيراد من Excel
                    </Link>
                    <Link href={here({ panel: "new-level" })} className="abtn abtn-light" scroll={false}>
                      <Icon name="plus" size={17} /> إضافة مستوى يدويًا
                    </Link>
                  </>
                }
              >
                المستوى = مجموعة أسئلة يلعبها الطالب مرة واحدة. أسرع طريقة: نزّل القالب، اكتب الأسئلة برقم المرحلة {stage.number}، ثم ارفعه.
              </EmptyState>
            ) : (
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>مستويات المرحلة</h2>
                    <p>بالترتيب الذي يلعبه الطالب. المسودة لا تظهر للطلاب حتى تنشرها من صفحة المستوى.</p>
                  </div>
                </div>
                <ol className="level-list">
                  {levels.map((l) => {
                    const t = GAME_TYPE_LABEL[l.type];
                    const { min, max } = WORD_LIMITS[l.type];
                    const countOk = l._count.words >= min && l._count.words <= max;
                    return (
                      <li key={l.id} className={`level-row is-${l.status}`}>
                        <span className="level-order">{l.order}</span>
                        <span className="level-main">
                          <Link href={`/admin/levels/${l.id}`} className="level-title">
                            {l.title}
                          </Link>
                          <span className="level-meta">
                            <span>
                              {t.icon} {t.name}
                            </span>
                            <span>{l.surah?.name ?? "عدة سور"}</span>
                            <span>{DIFFICULTY_LABEL[l.difficulty]}</span>
                            {l.audience !== "ALL" && <span>{AUDIENCE_LABEL[l.audience]} فقط</span>}
                          </span>
                        </span>
                        <span className={`level-count${countOk ? "" : " is-warn"}`} title={countOk ? undefined : `هذا الشكل يحتاج من ${min} إلى ${max} أسئلة`}>
                          <b>{l._count.words}</b> سؤال
                        </span>
                        <span className="level-played" title="عدد الطلاب الذين لعبوه">
                          <Icon name="users" size={15} /> {l._count.progress}
                        </span>
                        <span className={`badge badge-${l.status}`}>{STATUS_LABEL[l.status]}</span>
                        <span className="actions">
                          <Link href={`/admin/levels/${l.id}`} className="abtn abtn-light abtn-sm">
                            <Icon name="edit" size={15} /> تعديل
                          </Link>
                          <Link href={`/admin/levels/${l.id}/preview`} className="abtn abtn-light abtn-sm" aria-label={`معاينة ${l.title}`}>
                            <Icon name="eye" size={15} />
                          </Link>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </div>
        )}
      </div>

      {panel === "import" && (
        <Drawer title="استيراد الأسئلة من Excel" kicker="ملف واحد لأي عدد من المراحل" closeHref={close} wide>
          <ImportForm />
        </Drawer>
      )}

      {panel === "stage" && stage && (
        <Drawer title={`تعديل المرحلة ${stage.number}`} kicker={station ? `${station.icon} المحطة ${station.order}: ${station.title}` : undefined} closeHref={close}>
          <ActionForm action={saveStage.bind(null, stage.id)} className="drawer-form">
            <label className="fld">
              عنوان المرحلة
              <input name="title" defaultValue={stage.title} required minLength={2} maxLength={120} />
              <small className="fld-help">يظهر للطالب على خريطة المحطة.</small>
            </label>
            <label className="fld">
              العنقود القيمي
              <textarea name="valueCluster" defaultValue={stage.valueCluster} required minLength={3} maxLength={600} rows={6} />
              <small className="fld-help">القيم التي تبنيها هذه المرحلة، من وثيقة المنهج. تساعد في كتابة أسئلة «قيمة وسلوك».</small>
            </label>
            <StatusChoice value={stage.status} what="المرحلة" />
            <div className="fld">
              السور (ثابتة من المنهج)
              <span className="chips">
                {stage.surahs.map((s) => (
                  <span key={s.surah.number} className="chip">
                    {s.surah.name}
                    {s.fromAyah ? ` ${s.fromAyah}–${s.toAyah}` : ""}
                  </span>
                ))}
              </span>
            </div>
            <div className="drawer-foot">
              <SubmitButton>حفظ المرحلة</SubmitButton>
              <Link href={close} className="abtn abtn-light" scroll={false}>
                إغلاق
              </Link>
            </div>
          </ActionForm>
        </Drawer>
      )}

      {panel === "station" && editStation && (
        <Drawer title={`تعديل المحطة ${editStation.order}`} kicker="المحطة تجمع 4 مراحل" closeHref={close}>
          <ActionForm action={saveStation.bind(null, editStation.id)} className="drawer-form">
            <label className="fld">
              عنوان المحطة
              <input name="title" defaultValue={editStation.title} required minLength={2} maxLength={120} />
            </label>
            <div className="form-row">
              <label className="fld">
                الأيقونة
                <input name="icon" defaultValue={editStation.icon} required maxLength={8} />
                <small className="fld-help">رمز تعبيري واحد.</small>
              </label>
              <label className="fld">
                اللون
                <input name="color" type="color" defaultValue={editStation.color} />
                <small className="fld-help">لون المحطة في التطبيق.</small>
              </label>
            </div>
            <label className="fld">
              الهدف العام
              <textarea name="goal" defaultValue={editStation.goal} required minLength={3} maxLength={400} rows={5} />
              <small className="fld-help">يقرؤه الطالب في «عن هذه المحطة».</small>
            </label>
            <StatusChoice value={editStation.status} what="المحطة" />
            <div className="drawer-foot">
              <SubmitButton>حفظ المحطة</SubmitButton>
              <Link href={close} className="abtn abtn-light" scroll={false}>
                إغلاق
              </Link>
            </div>
          </ActionForm>
        </Drawer>
      )}

      {panel === "new-level" && stage && (
        <Drawer title="مستوى جديد" kicker={`المرحلة ${stage.number}: ${stage.title}`} closeHref={close} wide>
          <p className="drawer-note">
            يُنشأ المستوى كمسودة، ثم تنتقل لصفحته لإضافة الأسئلة ونشره. لإضافة مستويات كثيرة مرة واحدة استخدم{" "}
            <Link href={here({ panel: "import" })} scroll={false}>
              استيراد Excel
            </Link>
            .
          </p>
          <ActionForm action={saveLevel.bind(null, null)}>
            <input type="hidden" name="stageId" value={stage.id} />
            <input type="hidden" name="status" value="DRAFT" />
            <LevelFields order={(levels.at(-1)?.order ?? 0) + 1} surahs={stage.surahs.map((s) => s.surah)} />
          </ActionForm>
        </Drawer>
      )}
    </>
  );
}

type StageSurahRow = { fromAyah: number | null; toAyah: number | null; surah: { number: number; name: string } };
const CHIPS_SHOWN = 10;

/** A stage can hold 37 surahs (جزء عمّ): show the first ones and fold the rest. */
function SurahChips({ surahs }: { surahs: StageSurahRow[] }) {
  const chip = (s: StageSurahRow) => (
    <span key={s.surah.number} className="chip">
      {s.surah.name}
      {s.fromAyah ? ` ${s.fromAyah}–${s.toAyah}` : ""}
    </span>
  );
  if (surahs.length <= CHIPS_SHOWN + 2) return <span className="chips">{surahs.map(chip)}</span>;
  return (
    <details className="chips-more">
      <summary className="chips">
        {surahs.slice(0, CHIPS_SHOWN).map(chip)}
        <span className="chip is-more">+{surahs.length - CHIPS_SHOWN} سورة</span>
      </summary>
      <span className="chips">{surahs.slice(CHIPS_SHOWN).map(chip)}</span>
    </details>
  );
}

/** Published / draft as two explained choices instead of a bare dropdown. */
function StatusChoice({ value, what }: { value: string; what: string }) {
  return (
    <fieldset className="choice-group">
      <legend className="fld">الحالة</legend>
      <label className="choice">
        <input type="radio" name="status" value="PUBLISHED" defaultChecked={value === "PUBLISHED"} />
        <span>
          <b>منشورة</b>
          <small>تظهر {what} للطلاب.</small>
        </span>
      </label>
      <label className="choice">
        <input type="radio" name="status" value="DRAFT" defaultChecked={value === "DRAFT"} />
        <span>
          <b>مسودة</b>
          <small>مخفية عن الطلاب حتى تنشرها.</small>
        </span>
      </label>
    </fieldset>
  );
}
