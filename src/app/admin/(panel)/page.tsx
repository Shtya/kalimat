import Link from "next/link";
import { Icon } from "@/components/play/Icon";
import { stars, timeAgo } from "@/lib/format";
import { KIND_LABEL } from "@/lib/quran/labels";
import { requireAdmin } from "@/server/services/auth";
import { getOverview } from "@/server/services/reports";

export const metadata = { title: "الرئيسية" };

const tone = (pct: number | null) => (pct === null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "mid" : "low");

export default async function OverviewPage() {
  const [admin, o] = await Promise.all([requireAdmin(), getOverview()]);
  const readyPct = Math.round((o.readyStages / o.totalStages) * 100);

  // One sentence that says where things stand and what to do next.
  const status =
    o.readyStages === 0
      ? "ابدأ برفع أسئلة المرحلة الأولى ليبدأ الطلاب اللعب."
      : o.nextEmptyStage
        ? `${o.readyStages} من ${o.totalStages} مرحلة جاهزة للطلاب. التالية: المرحلة ${o.nextEmptyStage.number} «${o.nextEmptyStage.title}».`
        : "كل مراحل المنهج جاهزة للطلاب.";

  const attention = [
    o.nextEmptyStage && {
      icon: "upload" as const,
      text: `المرحلة ${o.nextEmptyStage.number} بدون أسئلة`,
      action: "ارفع ملف Excel",
      href: "/admin/content?panel=import",
    },
    o.drafts > 0 && { icon: "book" as const, text: `${o.drafts} مستوى مسودة لم يُنشر`, action: "راجع المستويات", href: "/admin/content" },
    o.hardest && {
      icon: "alert" as const,
      text: `سؤال «${o.hardest.word.text}» يخطئ فيه ${100 - (o.hardest.pct ?? 0)}٪ من الطلاب`,
      action: "اعرف الأسئلة الصعبة",
      href: "/admin/insights",
    },
    o.inactive > 0 && { icon: "users" as const, text: `${o.inactive} طالب لم يلعب منذ أسبوع`, action: "عرض الطلاب", href: "/admin/students" },
  ].filter(Boolean) as { icon: "upload" | "book" | "alert" | "users"; text: string; action: string; href: string }[];

  return (
    <>
      <header className="dash-hero">
        <div>
          <h1>أهلًا {admin.name}</h1>
          <p>{status}</p>
        </div>
        <div className="actions">
          <Link href="/admin/content?panel=import" className="abtn abtn-lg">
            <Icon name="upload" size={20} /> رفع أسئلة Excel
          </Link>
        </div>
      </header>

      <section className="kpis" aria-label="الأرقام الأساسية">
        <Link href="/admin/students" className="kpi">
          <span className="kpi-icon is-blue">
            <Icon name="users" />
          </span>
          <b>{o.students}</b>
          <span className="kpi-label">طالب مسجّل</span>
          <small>{o.activeThisWeek} لعبوا هذا الأسبوع</small>
        </Link>
        <Link href="/admin/content" className="kpi">
          <span className="kpi-icon is-gold">
            <Icon name="layers" />
          </span>
          <b>
            {o.readyStages}
            <i>/{o.totalStages}</i>
          </b>
          <span className="kpi-label">مرحلة جاهزة بالأسئلة</span>
          <span className="kpi-bar" aria-hidden>
            <i style={{ width: `${readyPct}%` }} />
          </span>
        </Link>
        <Link href="/admin/insights" className="kpi">
          <span className={`kpi-icon is-${tone(o.mastery.pct)}`}>
            <Icon name="chart" />
          </span>
          <b>{o.mastery.pct === null ? "—" : `${o.mastery.pct}٪`}</b>
          <span className="kpi-label">إتقان المعارف</span>
          <small>{o.mastery.answered ? `إجابات صحيحة من أول مرة (${o.mastery.answered} إجابة)` : "يظهر بعد أول إجابات للطلاب"}</small>
        </Link>
        <div className="kpi">
          <span className="kpi-icon is-teal">
            <Icon name="check" />
          </span>
          <b>{o.completedThisWeek}</b>
          <span className="kpi-label">مستوى أُنجز هذا الأسبوع</span>
          <small>كل مستوى يُحسب مرة لكل طالب</small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>خريطة المنهج</h2>
            <p>كل مربع مرحلة. اللون يوضح إتقان الطلاب، والمربع المنقّط مرحلة بدون أسئلة بعد.</p>
          </div>
          <div className="legend" aria-hidden>
            <span className="lg-good">إتقان عالٍ</span>
            <span className="lg-mid">متوسط</span>
            <span className="lg-low">يحتاج دعم</span>
            <span className="lg-empty">بدون أسئلة</span>
          </div>
        </div>
        <div className="matrix">
          {o.matrix.map((st) => (
            <div key={st.id} className="matrix-row" style={{ "--c": st.color } as React.CSSProperties}>
              <div className="matrix-station">
                <span aria-hidden>{st.icon}</span>
                <span>
                  <small>المحطة {st.order}</small>
                  <b>{st.title}</b>
                </span>
              </div>
              {st.stages.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/content?stage=${s.id}`}
                  className={`matrix-cell ${s.levels === 0 ? "is-empty" : `is-${tone(s.mastery?.pct ?? null)}`}`}
                  title={s.title}
                >
                  <span className="cell-num">{s.number}</span>
                  <span className="cell-title">{s.title}</span>
                  <span className="cell-meta">
                    {s.levels === 0 ? (
                      "بدون أسئلة"
                    ) : (
                      <>
                        {s.levels} مستوى · {s.questions} سؤال
                        {s.mastery?.pct != null && <b>{s.mastery.pct}٪</b>}
                      </>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>يحتاج انتباهك</h2>
          </div>
          {attention.length === 0 ? (
            <p className="muted">لا شيء الآن. كل شيء يسير بشكل جيد.</p>
          ) : (
            <ul className="todo">
              {attention.map((a) => (
                <li key={a.text}>
                  <span className="todo-icon">
                    <Icon name={a.icon} size={18} />
                  </span>
                  <span className="todo-text">{a.text}</span>
                  <Link href={a.href} className="abtn abtn-light abtn-sm">
                    {a.action}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {o.hardest && (
            <p className="muted small-note">
              نوع السؤال الأصعب: {KIND_LABEL[o.hardest.word.kind].icon} {KIND_LABEL[o.hardest.word.kind].name} — {o.hardest.word.hint}
            </p>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>آخر النشاط</h2>
            <Link href="/admin/students" className="link-more">
              كل الطلاب
            </Link>
          </div>
          {o.recent.length === 0 ? (
            <p className="muted">سيظهر هنا ما يلعبه الطلاب أولًا بأول.</p>
          ) : (
            <ul className="feed">
              {o.recent.map((r) => (
                <li key={r.id}>
                  <span className="feed-avatar" aria-hidden>
                    {Array.from(r.student.name)[0]}
                  </span>
                  <span className="feed-text">
                    <Link href={`/admin/students/${r.student.id}`} className="row-link">
                      {r.student.name}
                    </Link>{" "}
                    أنهى «{r.level.title}»
                    <small>
                      المرحلة {r.level.stage.number} · {timeAgo(r.updatedAt)}
                    </small>
                  </span>
                  <span className="feed-stars" aria-label={`${r.stars} نجوم`}>
                    {stars(r.stars)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
