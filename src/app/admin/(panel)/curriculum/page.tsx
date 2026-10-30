import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Dropdown } from "@/components/admin/Dropdown";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/format";
import { saveStage, saveStation } from "../../actions";

export const metadata = { title: "المنهج" };

const STATUS_OPTIONS = [
  { value: "PUBLISHED", label: "منشور" },
  { value: "DRAFT", label: "مسودة (مخفي عن الطلاب)" },
];

export default async function CurriculumPage() {
  const stations = await db.station.findMany({
    orderBy: { order: "asc" },
    include: {
      stages: {
        orderBy: { number: "asc" },
        include: {
          surahs: { orderBy: { order: "asc" }, include: { surah: { select: { name: true } } } },
          _count: { select: { levels: true } },
          levels: { select: { _count: { select: { words: true } } } },
        },
      },
    },
  });

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>المنهج: نحو جيل قرآني</h1>
          <p>6 محطات × 4 مراحل = 24 مرحلة تغطي سور القرآن الـ114. الطالب يمشي فيها بالترتيب.</p>
        </div>
        <Link href="/admin/import" className="abtn">
          📥 رفع الأسئلة من Excel
        </Link>
      </div>

      {stations.map((st) => (
        <section key={st.id} className="panel station-panel" style={{ "--c": st.color } as React.CSSProperties}>
          <details className="inline-edit">
            <summary>
              <h2 style={{ display: "inline" }}>
                <span aria-hidden>{st.icon}</span> المحطة {st.order}: {st.title}
              </h2>{" "}
              <span className={`badge badge-${st.status}`}>{STATUS_LABEL[st.status]}</span> <small className="muted">✎ تعديل</small>
            </summary>
            <ActionForm action={saveStation.bind(null, st.id)}>
              <div className="form-row">
                <label className="fld">
                  العنوان
                  <input name="title" defaultValue={st.title} required />
                </label>
                <label className="fld">
                  الأيقونة
                  <input name="icon" defaultValue={st.icon} required maxLength={8} />
                </label>
                <label className="fld">
                  اللون
                  <input name="color" type="color" defaultValue={st.color} />
                </label>
                <div className="fld">
                  الحالة
                  <Dropdown name="status" defaultValue={st.status} options={STATUS_OPTIONS} />
                </div>
              </div>
              <label className="fld" style={{ marginTop: 10 }}>
                الهدف العام
                <textarea name="goal" defaultValue={st.goal} required />
              </label>
              <div className="actions" style={{ marginTop: 10 }}>
                <SubmitButton>حفظ المحطة</SubmitButton>
              </div>
            </ActionForm>
          </details>
          <p className="muted" style={{ margin: "6px 0 12px" }}>
            {st.goal}
          </p>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>المرحلة</th>
                  <th>السور</th>
                  <th>المستويات</th>
                  <th>الأسئلة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {st.stages.map((stage) => (
                  <tr key={stage.id}>
                    <td className="num muted">{stage.number}</td>
                    <td style={{ minWidth: 240 }}>
                      <details className="inline-edit">
                        <summary>
                          <b>{stage.title}</b> <small className="muted">✎</small>
                        </summary>
                        <ActionForm action={saveStage.bind(null, stage.id)}>
                          <label className="fld">
                            العنوان
                            <input name="title" defaultValue={stage.title} required />
                          </label>
                          <label className="fld" style={{ marginTop: 8 }}>
                            العنقود القيمي
                            <textarea name="valueCluster" defaultValue={stage.valueCluster} required />
                          </label>
                          <div className="form-row" style={{ marginTop: 8 }}>
                            <div className="fld">
                              الحالة
                              <Dropdown name="status" defaultValue={stage.status} options={STATUS_OPTIONS} />
                            </div>
                            <SubmitButton>حفظ</SubmitButton>
                          </div>
                        </ActionForm>
                      </details>
                    </td>
                    <td className="muted" style={{ fontSize: "0.85rem" }}>
                      {stage.surahs.map((s) => s.surah.name + (s.fromAyah ? ` (${s.fromAyah}–${s.toAyah})` : "")).join("، ")}
                    </td>
                    <td className="num">
                      <Link href={`/admin/levels?stage=${stage.id}`} className="row-link">
                        {stage._count.levels} ←
                      </Link>
                    </td>
                    <td className="num">{stage.levels.reduce((s, l) => s + l._count.words, 0)}</td>
                    <td>
                      <span className={`badge badge-${stage.status}`}>{STATUS_LABEL[stage.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
