import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Meter } from "@/components/admin/Meter";
import { duration, stars, timeAgo } from "@/lib/format";
import { KIND_LABEL, KINDS, TRACK_LABEL } from "@/lib/quran/labels";
import { SURAHS } from "@/lib/quran/surahs";
import { getStudentDetail } from "@/server/services/reports";
import { deleteStudent } from "../../../actions";

export const metadata = { title: "تفاصيل الطالب" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getStudentDetail(id);
  if (!s) notFound();

  return (
    <>
      <nav className="crumbs" aria-label="المسار">
        <Link href="/admin/students">الطلاب</Link>/<span>{s.name}</span>
      </nav>
      <div className="adm-head">
        <div>
          <h1>{s.name}</h1>
          <p>
            مسار {TRACK_LABEL[s.track].name} · انضم {timeAgo(s.createdAt)} · آخر نشاط {timeAgo(s.lastActiveAt)}
          </p>
          {(s.phone || s.email) && (
            <p>
              حساب محفوظ{s.phone ? ` · ${s.phone}` : ""}
              {s.email ? ` · ${s.email}` : ""}
            </p>
          )}
        </div>
        <ActionForm action={deleteStudent.bind(null, s.id)} confirm={`حذف "${s.name}" وكل تقدمه؟`}>
          <SubmitButton className="abtn abtn-danger">حذف الطالب</SubmitButton>
        </ActionForm>
      </div>

      <div className="stats">
        <div className="stat">
          <span>آخر مستوى</span>
          <b style={{ fontSize: "1.15rem", paddingTop: 6 }}>
            {s.lastLevel ? (
              <>
                {s.lastLevel.title}
                <small className="muted" style={{ display: "block", fontSize: "0.8rem" }}>
                  المرحلة {s.lastLevel.stage.number}: {s.lastLevel.stage.title}
                </small>
              </>
            ) : (
              "—"
            )}
          </b>
        </div>
        <div className="stat">
          <span>مستويات مكتملة</span>
          <b>{s.totals.completed}</b>
        </div>
        <div className="stat">
          <span>النجوم</span>
          <b style={{ color: "var(--gold-deep)" }}>★ {s.totals.stars}</b>
        </div>
        <div className="stat">
          <span>النقاط</span>
          <b>{s.totals.score}</b>
        </div>
        <div className="stat">
          <span>عدد المحاولات</span>
          <b>{s.totals.attempts}</b>
        </div>
        <div className="stat">
          <span>وقت اللعب</span>
          <b style={{ fontSize: "1.4rem" }}>{duration(s.totals.timeSpent)}</b>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>🎯 إتقان المعارف حسب النوع</h2>
          <p className="muted" style={{ marginTop: -6, fontSize: "0.85rem" }}>
            الإتقان العام: <b>{s.knowledge.overall.pct === null ? "—" : `${s.knowledge.overall.pct}%`}</b> — نسبة الإجابة الصحيحة من أول مرة وبدون تلميح.
          </p>
          <table className="table">
            <tbody>
              {KINDS.map((k) => (
                <tr key={k}>
                  <td>
                    {KIND_LABEL[k].icon} {KIND_LABEL[k].name}
                  </td>
                  <td>
                    <Meter m={s.knowledge.byKind.get(k)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>📖 إتقان المعارف حسب السورة</h2>
          {s.knowledge.bySurah.size === 0 ? (
            <p className="muted">لم يُجب عن أي سؤال بعد.</p>
          ) : (
            <table className="table">
              <tbody>
                {[...s.knowledge.bySurah].map(([n, m]) => (
                  <tr key={n}>
                    <td>
                      <b>{SURAHS[n - 1].name}</b>
                    </td>
                    <td>
                      <Meter m={m} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>تقدم المستويات</h2>
        {s.progress.length === 0 ? (
          <p className="muted">لم يلعب أي مرحلة بعد.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>المستوى</th>
                  <th>النجوم</th>
                  <th>أفضل نقاط</th>
                  <th>المحاولات</th>
                  <th>الوقت</th>
                  <th>اكتملت</th>
                  <th>آخر لعب</th>
                </tr>
              </thead>
              <tbody>
                {s.progress.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/levels/${p.level.id}`} className="row-link">
                        {p.level.title}
                      </Link>
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        المرحلة {p.level.stage.number}: {p.level.stage.title}
                      </div>
                    </td>
                    <td style={{ color: "var(--gold-deep)" }}>{stars(p.stars)}</td>
                    <td className="num">{p.score}</td>
                    <td className="num">{p.attempts}</td>
                    <td className="num">{duration(p.timeSpent)}</td>
                    <td className="num muted">{p.completedAt ? timeAgo(p.completedAt) : "—"}</td>
                    <td className="num muted">{timeAgo(p.updatedAt)}</td>
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
