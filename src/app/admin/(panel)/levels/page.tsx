import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { db } from "@/lib/db";
import { DIFFICULTY_LABEL, GAME_TYPE_LABEL, STATUS_LABEL } from "@/lib/format";
import { AUDIENCE_LABEL } from "@/lib/quran/labels";
import { saveLevel } from "../../actions";
import { LevelFields } from "./LevelFields";

export const metadata = { title: "المستويات والأسئلة" };

export default async function LevelsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const sp = await searchParams;
  const stations = await db.station.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true, title: true, icon: true, stages: { orderBy: { number: "asc" }, select: { id: true, number: true, title: true, _count: { select: { levels: true } } } } },
  });
  const allStages = stations.flatMap((s) => s.stages);
  const stage = allStages.find((s) => s.id === sp.stage) ?? allStages[0];
  const station = stations.find((s) => s.stages.some((st) => st.id === stage?.id));

  const [levels, stageSurahs] = stage
    ? await Promise.all([
        db.level.findMany({
          where: { stageId: stage.id },
          orderBy: { order: "asc" },
          include: { surah: { select: { name: true } }, _count: { select: { words: true, progress: true } } },
        }),
        db.stageSurah.findMany({ where: { stageId: stage.id }, orderBy: { order: "asc" }, select: { surah: { select: { number: true, name: true } } } }),
      ])
    : [[], []];

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>المستويات والأسئلة</h1>
          <p>
            {station && `${station.icon} المحطة ${station.order} · `}
            {stage ? `المرحلة ${stage.number}: ${stage.title} — ${levels.length} مستوى` : ""}
          </p>
        </div>
        <div className="actions">
          <Link href="/admin/import" className="abtn">
            📥 رفع Excel
          </Link>
          {stage && (
            <a href={`/admin/files/export?stage=${stage.number}`} className="abtn abtn-light">
              ⬇️ تنزيل أسئلة المرحلة
            </a>
          )}
        </div>
      </div>

      <div className="stage-picker">
        {stations.map((st) => (
          <div key={st.id} className="stage-picker-row">
            <span className="muted" title={st.title}>
              {st.icon} {st.order}
            </span>
            {st.stages.map((s) => (
              <Link key={s.id} href={`/admin/levels?stage=${s.id}`} className={`abtn abtn-sm ${s.id === stage?.id ? "" : "abtn-light"}`} title={s.title}>
                {s.number}
                <small className="muted" style={{ fontWeight: 600 }}>
                  ({s._count.levels})
                </small>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <section className="panel">
        {levels.length === 0 ? (
          <p className="muted">لا توجد مستويات في هذه المرحلة بعد. ارفع ملف Excel أو أضف مستوى يدويًا.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>المستوى</th>
                  <th>السورة</th>
                  <th>الشكل</th>
                  <th>المسار</th>
                  <th>الصعوبة</th>
                  <th>الحالة</th>
                  <th>الأسئلة</th>
                  <th>لعبه</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {levels.map((l) => (
                  <tr key={l.id}>
                    <td className="num muted">{l.order}</td>
                    <td>
                      <Link href={`/admin/levels/${l.id}`} className="row-link">
                        {l.title}
                      </Link>
                    </td>
                    <td className="muted">{l.surah?.name ?? "عدة سور"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {GAME_TYPE_LABEL[l.type].icon} {GAME_TYPE_LABEL[l.type].name}
                    </td>
                    <td className="muted">{AUDIENCE_LABEL[l.audience]}</td>
                    <td>
                      <span className={`badge badge-${l.difficulty}`}>{DIFFICULTY_LABEL[l.difficulty]}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${l.status}`}>{STATUS_LABEL[l.status]}</span>
                    </td>
                    <td className="num">{l._count.words}</td>
                    <td className="num">{l._count.progress}</td>
                    <td>
                      <div className="actions">
                        <Link href={`/admin/levels/${l.id}`} className="abtn abtn-light abtn-sm">
                          تعديل
                        </Link>
                        <Link href={`/admin/levels/${l.id}/preview`} className="abtn abtn-light abtn-sm">
                          معاينة
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {stage && (
        <section className="panel">
          <details>
            <summary style={{ cursor: "pointer" }}>
              <b>+ إضافة مستوى يدويًا</b> <small className="muted">(الأسهل: رفع ملف Excel)</small>
            </summary>
            <div style={{ marginTop: 12 }}>
              <ActionForm action={saveLevel.bind(null, null)}>
                <input type="hidden" name="stageId" value={stage.id} />
                <input type="hidden" name="status" value="DRAFT" />
                <LevelFields order={(levels.at(-1)?.order ?? 0) + 1} surahs={stageSurahs.map((s) => s.surah)} />
              </ActionForm>
            </div>
          </details>
        </section>
      )}
    </>
  );
}
