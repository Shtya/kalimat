import Link from "next/link";
import { stars, timeAgo } from "@/lib/format";
import { getOverview } from "@/server/services/reports";

export const metadata = { title: "نظرة عامة" };

export default async function OverviewPage() {
  const o = await getOverview();
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>نظرة عامة</h1>
          <p>ملخص نشاط الطلاب ومستويات اللعب</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>عدد الطلاب</span>
          <b>{o.students}</b>
        </div>
        <div className="stat">
          <span>نشطون هذا الأسبوع</span>
          <b>{o.activeThisWeek}</b>
        </div>
        <div className="stat">
          <span>متوسط النقاط لكل مستوى</span>
          <b>{o.avgScore}</b>
        </div>
        <div className="stat">
          <span>
            إتقان المعارف <Link href="/admin/insights">←</Link>
          </span>
          <b>{o.mastery.pct === null ? "—" : `${o.mastery.pct}%`}</b>
        </div>
        <div className="stat">
          <span>متوسط النجوم</span>
          <b>{o.avgStars} ★</b>
        </div>
        <div className="stat">
          <span>مستويات مكتملة</span>
          <b>{o.completions}</b>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>النشاط الأخير</h2>
          {o.recent.length === 0 ? (
            <p className="muted">لا يوجد نشاط بعد.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>المرحلة</th>
                    <th>النجوم</th>
                    <th>متى</th>
                  </tr>
                </thead>
                <tbody>
                  {o.recent.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link className="row-link" href={`/admin/students/${r.student.id}`}>
                          {r.student.name}
                        </Link>
                      </td>
                      <td>
                        {r.level.title}
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          المرحلة {r.level.stage.number}: {r.level.stage.title}
                        </div>
                      </td>
                      <td style={{ color: "var(--gold-deep)" }}>{stars(r.stars)}</td>
                      <td className="muted num">{timeAgo(r.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>أصعب المراحل</h2>
          <p className="muted" style={{ marginTop: -6, fontSize: "0.85rem" }}>
            الأقل في متوسط النجوم (لاعبان على الأقل)
          </p>
          {o.hardest.length === 0 ? (
            <p className="muted">لا توجد بيانات كافية بعد.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>المرحلة</th>
                    <th>متوسط النجوم</th>
                    <th>المحاولات</th>
                    <th>اللاعبون</th>
                  </tr>
                </thead>
                <tbody>
                  {o.hardest.map(({ level, avgStars, avgAttempts, players }) =>
                    level ? (
                      <tr key={level.id}>
                        <td>
                          <Link className="row-link" href={`/admin/levels/${level.id}`}>
                            {level.title}
                          </Link>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>
                            المرحلة {level.stage.number}: {level.stage.title}
                          </div>
                        </td>
                        <td>
                          <div className="hbar">
                            <i style={{ width: `${(avgStars / 3) * 100}%` }} />
                          </div>
                          <small className="num">{avgStars.toFixed(1)} / 3</small>
                        </td>
                        <td className="num">{avgAttempts.toFixed(1)}</td>
                        <td className="num">{players}</td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
