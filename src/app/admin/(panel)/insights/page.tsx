import Link from "next/link";
import { Fragment } from "react";
import { Dropdown } from "@/components/admin/Dropdown";
import { Meter } from "@/components/admin/Meter";
import { db } from "@/lib/db";
import { KIND_LABEL, KINDS, TRACK_LABEL, TRACKS, type Track } from "@/lib/quran/labels";
import { SURAHS } from "@/lib/quran/surahs";
import { getHardestQuestions, getKnowledge } from "@/server/services/reports";

export const metadata = { title: "قياس المعارف" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const sp = await searchParams;
  const track = TRACKS.includes(sp.track as Track) ? (sp.track as Track) : undefined;
  const [knowledge, hardest, stations] = await Promise.all([
    getKnowledge({ track }),
    getHardestQuestions({ track }),
    db.station.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true, title: true, icon: true, stages: { orderBy: { number: "asc" }, select: { id: true, number: true, title: true } } } }),
  ]);
  const surahsWithData = SURAHS.filter((s) => knowledge.bySurah.has(s.number));

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>قياس المعارف</h1>
          <p>نسبة الإتقان = الأسئلة التي أجاب عنها الطالب صح من أول مرة وبدون تلميح. تُحسب آخر محاولة لكل طالب في كل سؤال.</p>
        </div>
      </div>

      <form className="filters" method="get">
        <div className="fld">
          المسار
          <Dropdown name="track" defaultValue={track ?? ""} options={[{ value: "", label: "كل المسارات" }, ...TRACKS.map((t) => ({ value: t, label: TRACK_LABEL[t].name }))]} />
        </div>
        <button className="abtn abtn-light">عرض</button>
      </form>

      <div className="stats">
        <div className="stat">
          <span>الإتقان العام</span>
          <b>{knowledge.overall.pct === null ? "—" : `${knowledge.overall.pct}%`}</b>
          <small className="muted">{knowledge.overall.answered} إجابة</small>
        </div>
        {KINDS.map((k) => (
          <div key={k} className="stat">
            <span>
              {KIND_LABEL[k].icon} {KIND_LABEL[k].name}
            </span>
            <Meter m={knowledge.byKind.get(k)} />
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>الإتقان حسب المرحلة</h2>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {stations.map((st) => (
                  <Fragment key={st.id}>
                    <tr className="group-row">
                      <td colSpan={3}>
                        {st.icon} المحطة {st.order}: {st.title}
                      </td>
                    </tr>
                    {st.stages.map((stage) => (
                      <tr key={stage.id}>
                        <td className="num muted">{stage.number}</td>
                        <td>
                          <Link href={`/admin/levels?stage=${stage.id}`} className="row-link">
                            {stage.title}
                          </Link>
                        </td>
                        <td>
                          <Meter m={knowledge.byStage.get(stage.id)} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>الإتقان حسب السورة</h2>
          {surahsWithData.length === 0 ? (
            <p className="muted">لا توجد إجابات بعد.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>السورة</th>
                    <th>الإتقان</th>
                    <th>الطلاب</th>
                  </tr>
                </thead>
                <tbody>
                  {surahsWithData
                    .map((s) => ({ s, m: knowledge.bySurah.get(s.number)! }))
                    .sort((a, b) => (a.m.pct ?? 0) - (b.m.pct ?? 0))
                    .map(({ s, m }) => (
                      <tr key={s.number}>
                        <td>
                          <b>{s.name}</b>
                        </td>
                        <td>
                          <Meter m={m} />
                        </td>
                        <td className="num">{m.students}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>أكثر الأسئلة خطأً</h2>
        <p className="muted" style={{ marginTop: -6, fontSize: "0.85rem" }}>
          أسئلة أجاب عنها 3 طلاب على الأقل — تدل على معلومة تحتاج شرحًا إضافيًا في الجلسة.
        </p>
        {hardest.length === 0 ? (
          <p className="muted">لا توجد بيانات كافية بعد.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الكلمة</th>
                  <th>السؤال</th>
                  <th>النوع</th>
                  <th>السورة</th>
                  <th>المستوى</th>
                  <th>الإتقان</th>
                </tr>
              </thead>
              <tbody>
                {hardest.map((h) => (
                  <tr key={h.word.id}>
                    <td>
                      <b>{h.word.text}</b>
                    </td>
                    <td style={{ maxWidth: 320 }}>{h.word.hint}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {KIND_LABEL[h.word.kind].icon} {KIND_LABEL[h.word.kind].name}
                    </td>
                    <td className="muted">
                      {h.word.surah?.name ?? "—"}
                      {h.word.ayah ? ` · ${h.word.ayah}` : ""}
                    </td>
                    <td>
                      <Link href={`/admin/levels/${h.word.level.id}`} className="row-link">
                        {h.word.level.stage.number} · {h.word.level.title}
                      </Link>
                    </td>
                    <td>
                      <Meter m={h} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
