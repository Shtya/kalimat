import Link from "next/link";
import { EmptyState, PageHead, Ring, Segmented } from "@/components/admin/ui";
import { Icon } from "@/components/play/Icon";
import { db } from "@/lib/db";
import { ANSWERS, count, QUESTIONS, STUDENTS } from "@/lib/format";
import { KIND_LABEL, KINDS, TRACK_LABEL, TRACKS, type Track } from "@/lib/quran/labels";
import { SURAHS } from "@/lib/quran/surahs";
import { getHardestQuestions, getKnowledge, type Mastery } from "@/server/services/reports";

export const metadata = { title: "قياس المعارف" };

const tone = (pct: number | null | undefined) => (pct == null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "mid" : "low");
const SURAHS_SHOWN = 8;

/** Bar with the percentage, for lists where the label sits beside it. */
function Bar({ m }: { m: Mastery }) {
  return (
    <span className={`kbar is-${tone(m.pct)}`} title={`${m.correct} من ${m.answered} إجابة صحيحة من أول مرة`}>
      <span aria-hidden>
        <i style={{ width: `${m.pct ?? 0}%` }} />
      </span>
      <b className="num">{m.pct === null ? "—" : `${m.pct}%`}</b>
    </span>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const sp = await searchParams;
  const track = TRACKS.includes(sp.track as Track) ? (sp.track as Track) : undefined;
  const [knowledge, hardest, stations] = await Promise.all([
    getKnowledge({ track }),
    getHardestQuestions({ track }, 3, 10),
    db.station.findMany({
      orderBy: { order: "asc" },
      select: { id: true, order: true, title: true, icon: true, color: true, stages: { orderBy: { number: "asc" }, select: { id: true, number: true, title: true } } },
    }),
  ]);
  const { overall } = knowledge;
  const kinds = KINDS.map((k) => ({ k, m: knowledge.byKind.get(k) })).filter((x) => x.m && x.m.pct !== null) as { k: (typeof KINDS)[number]; m: Mastery }[];
  const sorted = [...kinds].sort((a, b) => (a.m.pct ?? 0) - (b.m.pct ?? 0));
  const weakest = sorted.length > 1 ? sorted[0] : null;
  const strongest = sorted.length > 1 ? sorted.at(-1)! : null;
  const surahs = SURAHS.filter((s) => knowledge.bySurah.has(s.number))
    .map((s) => ({ s, m: knowledge.bySurah.get(s.number)! }))
    .sort((a, b) => (a.m.pct ?? 0) - (b.m.pct ?? 0));
  const trackHref = (t?: Track) => (t ? `/admin/insights?track=${t}` : "/admin/insights");

  return (
    <>
      <PageHead
        kicker="المتابعة"
        title="قياس المعارف"
        actions={
          <Segmented
            label="المسار العمري"
            items={[
              { href: trackHref(), label: "كل الطلاب", active: !track },
              ...TRACKS.map((t) => ({ href: trackHref(t), label: `${TRACK_LABEL[t].icon} ${TRACK_LABEL[t].name}`, active: track === t })),
            ]}
          />
        }
      >
        ماذا يعرف طلابك فعلًا؟ كل سؤال في اللعبة يقيس معلومة من نوع محدد. الإتقان = نسبة الأسئلة التي أجاب عنها الطالب صح من أول مرة وبدون تلميح (تُحسب آخر محاولة فقط).
      </PageHead>

      {overall.answered === 0 ? (
        <EmptyState
          icon="chart"
          title={track ? `لا توجد إجابات من مسار ${TRACK_LABEL[track].name} بعد` : "لا توجد إجابات بعد"}
          action={
            <Link href="/admin/content" className="abtn abtn-light">
              راجع المنهج والأسئلة
            </Link>
          }
        >
          ستظهر هنا النتائج تلقائيًا بمجرد أن يلعب الطلاب أول مستوى: نسبة الإتقان العامة، والأنواع والسور والمراحل الأقوى والأضعف، والأسئلة التي يخطئ فيها أكثر الطلاب.
        </EmptyState>
      ) : (
        <>
          <section className="k-hero">
            <Ring pct={overall.pct} size={128} label={`الإتقان العام ${overall.pct}%`} />
            <div className="k-hero-text">
              <small>الإتقان العام{track ? ` · ${TRACK_LABEL[track].name}` : ""}</small>
              <p>
                أجاب <b>{count(overall.students, STUDENTS)}</b> عن <b>{count(overall.answered, QUESTIONS)}</b>، منها <b>{overall.correct}</b> صحيحة من أول مرة.
              </p>
              {weakest && strongest && (
                <ul className="k-takeaways">
                  <li className="is-good">
                    <Icon name="check" size={16} /> الأقوى: <b>{KIND_LABEL[strongest.k].name}</b> ({strongest.m.pct}%)
                  </li>
                  <li className="is-low">
                    <Icon name="alert" size={16} /> يحتاج تركيزًا في الجلسة: <b>{KIND_LABEL[weakest.k].name}</b> ({weakest.m.pct}%)
                  </li>
                </ul>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>حسب نوع المعرفة</h2>
                <p>نوع كل سؤال يُحدَّد في ملف Excel (عمود «نوع المعرفة»).</p>
              </div>
            </div>
            <div className="kinds">
              {KINDS.map((k) => {
                const m = knowledge.byKind.get(k);
                return (
                  <article key={k} className={`kind-card is-${tone(m?.pct)}`}>
                    <header>
                      <span className="kind-icon" aria-hidden>
                        {KIND_LABEL[k].icon}
                      </span>
                      <b>{KIND_LABEL[k].name}</b>
                      {weakest?.k === k && <span className="kind-flag">الأضعف</span>}
                    </header>
                    <strong className="num">{m?.pct == null ? "—" : `${m.pct}%`}</strong>
                    <span className="kind-bar" aria-hidden>
                      <i style={{ width: `${m?.pct ?? 0}%` }} />
                    </span>
                    <small>{m ? `${count(m.answered, ANSWERS)} · ${count(m.students, STUDENTS)}` : "لا توجد أسئلة من هذا النوع بعد"}</small>
                    <p>{KIND_LABEL[k].help}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>حسب المرحلة</h2>
                <p>كل مربع مرحلة من المنهج. اضغط على مرحلة لفتح أسئلتها.</p>
              </div>
              <div className="legend" aria-hidden>
                <span className="lg-good">75% فأكثر</span>
                <span className="lg-mid">50–74%</span>
                <span className="lg-low">أقل من 50%</span>
                <span className="lg-empty">لم تُلعب</span>
              </div>
            </div>
            <div className="matrix">
              {stations.map((st) => (
                <div key={st.id} className="matrix-row" style={{ "--c": st.color } as React.CSSProperties}>
                  <div className="matrix-station">
                    <span aria-hidden>{st.icon}</span>
                    <span>
                      <small>المحطة {st.order}</small>
                      <b>{st.title}</b>
                    </span>
                  </div>
                  {st.stages.map((s) => {
                    const m = knowledge.byStage.get(s.id);
                    return (
                      <Link key={s.id} href={`/admin/content?stage=${s.id}`} className={`matrix-cell ${m ? `is-${tone(m.pct)}` : "is-empty"}`} title={s.title}>
                        <span className="cell-num">{s.number}</span>
                        <span className="cell-title">{s.title}</span>
                        <span className="cell-meta">
                          {m ? (
                            <>
                              {count(m.students, STUDENTS)}
                              <b>{m.pct}%</b>
                            </>
                          ) : (
                            "لم تُلعب بعد"
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <div className="grid-2">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>السور الأضعف</h2>
                  <p>مرتبة من الأقل إتقانًا. ابدأ بها في مراجعة الجلسة.</p>
                </div>
              </div>
              <ul className="k-list">
                {surahs.slice(0, SURAHS_SHOWN).map(({ s, m }) => (
                  <li key={s.number}>
                    <span className="k-list-label">
                      <b>{s.name}</b>
                      <small>
                        {count(m.students, STUDENTS)} · {count(m.answered, ANSWERS)}
                      </small>
                    </span>
                    <Bar m={m} />
                  </li>
                ))}
              </ul>
              {surahs.length > SURAHS_SHOWN && (
                <details className="rules">
                  <summary>كل السور ({surahs.length})</summary>
                  <ul className="k-list">
                    {surahs.slice(SURAHS_SHOWN).map(({ s, m }) => (
                      <li key={s.number}>
                        <span className="k-list-label">
                          <b>{s.name}</b>
                          <small>{count(m.students, STUDENTS)}</small>
                        </span>
                        <Bar m={m} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>أسئلة يخطئ فيها الطلاب</h2>
                  <p>أجاب عنها 3 طلاب على الأقل. غالبًا تدل على معلومة تحتاج شرحًا، أو سؤال صياغته غير واضحة.</p>
                </div>
              </div>
              {hardest.length === 0 ? (
                <EmptyState icon="info" title="لا توجد بيانات كافية بعد">
                  تظهر الأسئلة هنا بعد أن يجيب عن السؤال الواحد 3 طلاب على الأقل.
                </EmptyState>
              ) : (
                <ol className="hard-list">
                  {hardest.map((h) => (
                    <li key={h.word.id}>
                      <span className={`hard-pct is-${tone(h.pct)}`}>{h.pct}%</span>
                      <span className="hard-main">
                        <b>{h.word.text}</b>
                        <span>{h.word.hint}</span>
                        <small>
                          {KIND_LABEL[h.word.kind].icon} {KIND_LABEL[h.word.kind].name} · {h.word.surah?.name ?? "—"}
                          {h.word.ayah ? ` ${h.word.ayah}` : ""} · {count(h.answered, STUDENTS)}
                        </small>
                      </span>
                      <Link href={`/admin/levels/${h.word.level.id}`} className="abtn abtn-light abtn-sm" title={`المرحلة ${h.word.level.stage.number} · ${h.word.level.title}`}>
                        <Icon name="edit" size={15} /> السؤال
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
