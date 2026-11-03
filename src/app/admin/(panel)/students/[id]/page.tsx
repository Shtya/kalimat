import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { EmptyState, PageHead, Ring } from "@/components/admin/ui";
import { Icon } from "@/components/play/Icon";
import { count, duration, QUESTIONS, stars, timeAgo } from "@/lib/format";
import { KIND_LABEL, KINDS, TRACK_LABEL } from "@/lib/quran/labels";
import { SURAHS } from "@/lib/quran/surahs";
import { getJourney } from "@/server/services/progress";
import { getStudentDetail } from "@/server/services/reports";
import { deleteStudent } from "../../../actions";

export const metadata = { title: "تفاصيل الطالب" };

const tone = (pct: number | null | undefined) => (pct == null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "mid" : "low");

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getStudentDetail(id);
  if (!s) notFound();
  const journey = await getJourney({ id: s.id, track: s.track });
  const current = journey.levels.find((l) => l.id === journey.currentLevelId);
  const currentStage = journey.stations.flatMap((st) => st.stages.map((stage) => ({ st, stage }))).find(({ stage }) => stage.levels.some((l) => l.id === current?.id));
  const available = journey.levels.length;
  const surahs = [...s.knowledge.bySurah].map(([n, m]) => ({ name: SURAHS[n - 1].name, m })).sort((a, b) => (a.m.pct ?? 0) - (b.m.pct ?? 0));

  return (
    <>
      <nav className="crumbs" aria-label="المسار">
        <Link href="/admin/students">الطلاب</Link>/<span>{s.name}</span>
      </nav>
      <PageHead
        kicker={`${TRACK_LABEL[s.track].icon} مسار ${TRACK_LABEL[s.track].name} (${TRACK_LABEL[s.track].ages})`}
        title={s.name}
        actions={
          <Link href="/admin/students" className="abtn abtn-light">
            <Icon name="forward" size={17} /> كل الطلاب
          </Link>
        }
      >
        انضم {timeAgo(s.createdAt)} · آخر نشاط {timeAgo(s.lastActiveAt)}
        {(s.phone || s.email) && ` · حساب محفوظ (${[s.phone, s.email].filter(Boolean).join(" · ")})`}
      </PageHead>

      <div className="profile">
        <section className="profile-now">
          <small>يلعب الآن</small>
          {current && currentStage ? (
            <>
              <b>{current.title}</b>
              <span>
                {currentStage.st.icon} المحطة {currentStage.st.order} · المرحلة {currentStage.stage.number}: {currentStage.stage.title}
              </span>
            </>
          ) : (
            <b>{available > 0 && s.totals.completed >= available ? "أنهى كل المستويات المتاحة 🎉" : "لم يبدأ بعد"}</b>
          )}
          <span className="s-progress is-lg" title={`${s.totals.completed} من ${available} مستوى متاح`}>
            <span aria-hidden>
              <i style={{ width: `${available ? Math.min(100, Math.round((s.totals.completed / available) * 100)) : 0}%` }} />
            </span>
            <small className="num">
              {s.totals.completed} من {available} مستوى
            </small>
          </span>
        </section>
        <dl className="profile-stats">
          <div>
            <dt>النجوم</dt>
            <dd className="s-stars">
              <Icon name="star" size={18} filled /> {s.totals.stars}
            </dd>
          </div>
          <div>
            <dt>النقاط</dt>
            <dd>{s.totals.score}</dd>
          </div>
          <div>
            <dt>المحاولات</dt>
            <dd>{s.totals.attempts}</dd>
          </div>
          <div>
            <dt>وقت اللعب</dt>
            <dd>{duration(s.totals.timeSpent)}</dd>
          </div>
        </dl>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>التقدم في المحطات</h2>
            <p>المستويات المكتملة من المتاح لمساره في كل محطة.</p>
          </div>
        </div>
        <div className="station-bars">
          {journey.stations.map((st) => (
            <div key={st.id} className={`station-bar${st.total === 0 ? " is-empty" : ""}`} style={{ "--c": st.color } as React.CSSProperties}>
              <span aria-hidden>{st.icon}</span>
              <span className="station-bar-text">
                <small>المحطة {st.order}</small>
                <b>{st.title}</b>
              </span>
              <span className="s-progress">
                <span aria-hidden>
                  <i style={{ width: `${st.total ? Math.round((st.done / st.total) * 100) : 0}%` }} />
                </span>
                <small className="num">{st.total ? `${st.done}/${st.total}` : "بلا مستويات"}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>إتقان المعارف</h2>
              <p>صح من أول مرة وبدون تلميح، حسب آخر محاولة في كل سؤال.</p>
            </div>
          </div>
          {s.knowledge.overall.answered === 0 ? (
            <EmptyState icon="chart" title="لم يُجب عن أي سؤال بعد" />
          ) : (
            <div className="k-student">
              <Ring pct={s.knowledge.overall.pct} size={104} />
              <ul className="k-list">
                {KINDS.map((k) => {
                  const m = s.knowledge.byKind.get(k);
                  return (
                    <li key={k}>
                      <span className="k-list-label">
                        <b>
                          {KIND_LABEL[k].icon} {KIND_LABEL[k].name}
                        </b>
                        <small>{m ? count(m.answered, QUESTIONS) : "لم يُسأل بعد"}</small>
                      </span>
                      <span className={`kbar is-${tone(m?.pct)}`}>
                        <span aria-hidden>
                          <i style={{ width: `${m?.pct ?? 0}%` }} />
                        </span>
                        <b className="num">{m?.pct == null ? "—" : `${m.pct}%`}</b>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>حسب السورة</h2>
              <p>الأضعف أولًا.</p>
            </div>
          </div>
          {surahs.length === 0 ? (
            <EmptyState icon="book" title="لا توجد بيانات بعد" />
          ) : (
            <ul className="k-list is-scroll">
              {surahs.map(({ name, m }) => (
                <li key={name}>
                  <span className="k-list-label">
                    <b>{name}</b>
                    <small>{count(m.answered, QUESTIONS)}</small>
                  </span>
                  <span className={`kbar is-${tone(m.pct)}`}>
                    <span aria-hidden>
                      <i style={{ width: `${m.pct ?? 0}%` }} />
                    </span>
                    <b className="num">{m.pct}%</b>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>سجل المستويات</h2>
            <p>آخر ما لعبه أولًا.</p>
          </div>
        </div>
        {s.progress.length === 0 ? (
          <EmptyState icon="play" title="لم يلعب أي مستوى بعد">
            يظهر هنا كل مستوى يلعبه الطالب بنجومه ووقته وعدد محاولاته.
          </EmptyState>
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
                    <td className="num muted">{timeAgo(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel danger-zone">
        <div>
          <h2>حذف الطالب</h2>
          <p>يحذف الطالب وكل تقدمه وإجاباته من التقارير. لا يمكن التراجع.</p>
        </div>
        <ActionForm action={deleteStudent.bind(null, s.id)} confirm={`حذف "${s.name}" وكل تقدمه؟`}>
          <SubmitButton className="abtn abtn-danger">حذف الطالب</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
