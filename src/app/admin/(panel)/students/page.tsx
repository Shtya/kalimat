import Link from "next/link";
import { EmptyState, PageHead, Segmented } from "@/components/admin/ui";
import { Icon } from "@/components/play/Icon";
import { count, STUDENTS, timeAgo } from "@/lib/format";
import { TRACK_LABEL, TRACKS, type Track } from "@/lib/quran/labels";
import { getStudentSummary, listStudents, STUDENT_SORTS, STUDENT_STATUSES, type StudentSort, type StudentStatus } from "@/server/services/reports";

export const metadata = { title: "الطلاب" };

const STATUS_LABEL: Record<StudentStatus, string> = { active: "نشط هذا الأسبوع", idle: "متوقف منذ أسبوع+", new: "لم يُكمل مستوى بعد" };
const SORT_LABEL: Record<StudentSort, string> = { recent: "آخر نشاط", joined: "الأحدث انضمامًا", progress: "الأكثر تقدمًا", name: "الاسم" };
const WEEK = 7 * 86_400_000;

type Params = { q?: string; track?: string; status?: string; sort?: string; page?: string };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 40) || undefined;
  const track = TRACKS.includes(sp.track as Track) ? (sp.track as Track) : undefined;
  const status = STUDENT_STATUSES.includes(sp.status as StudentStatus) ? (sp.status as StudentStatus) : undefined;
  const sort = STUDENT_SORTS.includes(sp.sort as StudentSort) ? (sp.sort as StudentSort) : "recent";
  const [list, sum] = await Promise.all([listStudents({ q, track, status, sort, page: Number(sp.page) || 1 }), getStudentSummary()]);

  const params = { q, track, status, sort: sort === "recent" ? undefined : sort };
  const href = (over: Partial<Record<keyof Params, string | undefined>>) => {
    const merged = Object.entries({ ...params, ...over }).filter(([, v]) => v) as [string, string][];
    return `/admin/students${merged.length ? `?${new URLSearchParams(merged)}` : ""}`;
  };
  const filtered = !!(q || track || status);
  const now = Date.now();

  return (
    <>
      <PageHead
        kicker="المتابعة"
        title="الطلاب"
        actions={
          <a href={`/admin/files/students?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])}`} className="abtn abtn-light">
            <Icon name="download" size={18} /> تصدير Excel
          </a>
        }
      >
        كل طالب سجّل في التطبيق باسمه الأول ومساره العمري. اضغط على اسم الطالب لترى تقدمه في المنهج وإتقانه لكل نوع معرفة.
      </PageHead>

      <div className="sum-cards">
        <Link href={href({ status: undefined, page: undefined })} className={`sum-card${!status ? " is-active" : ""}`}>
          <span>كل الطلاب</span>
          <b>{sum.total}</b>
          <small>
            {TRACK_LABEL.CHILD.icon} {sum.CHILD} · {TRACK_LABEL.YOUTH.icon} {sum.YOUTH}
          </small>
        </Link>
        {STUDENT_STATUSES.map((s) => (
          <Link key={s} href={href({ status: status === s ? undefined : s, page: undefined })} className={`sum-card st-${s}${status === s ? " is-active" : ""}`}>
            <span>{STATUS_LABEL[s]}</span>
            <b>{sum[s]}</b>
            <small>{s === "active" ? "لعبوا خلال 7 أيام" : s === "idle" ? "قد يحتاجون تشجيعًا" : "سجّلوا ولم ينهوا أول مستوى"}</small>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="toolbar">
          <form method="get" role="search" className="search">
            <Icon name="search" size={18} />
            <input name="q" defaultValue={q} placeholder="ابحث باسم الطالب" aria-label="بحث باسم الطالب" />
            {track && <input type="hidden" name="track" value={track} />}
            {status && <input type="hidden" name="status" value={status} />}
            {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          </form>
          <Segmented
            label="المسار"
            items={[
              { href: href({ track: undefined, page: undefined }), label: "كل المسارات", active: !track },
              ...TRACKS.map((t) => ({ href: href({ track: t, page: undefined }), label: TRACK_LABEL[t].name, active: track === t })),
            ]}
          />
          <details className="menu">
            <summary className="abtn abtn-light abtn-sm">ترتيب: {SORT_LABEL[sort]}</summary>
            <div className="menu-pop">
              {STUDENT_SORTS.map((s) => (
                <Link key={s} href={href({ sort: s === "recent" ? undefined : s, page: undefined })} aria-current={s === sort ? "true" : undefined}>
                  <b>{SORT_LABEL[s]}</b>
                </Link>
              ))}
            </div>
          </details>
        </div>

        {filtered && (
          <p className="filter-note">
            {count(list.total, STUDENTS)} مطابق{q && ` لـ «${q}»`}
            {track && ` · ${TRACK_LABEL[track].name}`}
            {status && ` · ${STATUS_LABEL[status]}`}
            <Link href="/admin/students">مسح الفلاتر</Link>
          </p>
        )}

        {list.rows.length === 0 ? (
          filtered ? (
            <EmptyState icon="search" title="لا يوجد طلاب مطابقون" action={<Link href="/admin/students" className="abtn abtn-light">عرض كل الطلاب</Link>}>
              جرّب اسمًا آخر أو أزل أحد الفلاتر.
            </EmptyState>
          ) : (
            <EmptyState icon="users" title="لا يوجد طلاب بعد">
              يظهر الطالب هنا بمجرد أن يفتح التطبيق ويكتب اسمه الأول ويختار مساره. شارك رابط التطبيق مع طلابك.
            </EmptyState>
          )
        ) : (
          <div className="table-wrap">
            <table className="table students">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>التقدم في المنهج</th>
                  <th>النجوم</th>
                  <th>الإتقان</th>
                  <th>آخر نشاط</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((s) => {
                  const pct = s.available ? Math.min(100, Math.round((s.completed / s.available) * 100)) : 0;
                  const recent = now - s.lastActiveAt.getTime() < WEEK;
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/admin/students/${s.id}`} className="student-cell">
                          <span className={`s-avatar is-${s.track}`} aria-hidden>
                            {Array.from(s.name)[0]}
                          </span>
                          <span>
                            <b>{s.name}</b>
                            <small>
                              {TRACK_LABEL[s.track].icon} {TRACK_LABEL[s.track].name} · انضم {timeAgo(s.createdAt)}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="s-progress" title={`${s.completed} من ${s.available} مستوى متاح`}>
                          <span aria-hidden>
                            <i style={{ width: `${pct}%` }} />
                          </span>
                          <small className="num">
                            {s.completed}/{s.available}
                          </small>
                        </span>
                      </td>
                      <td className="num s-stars">
                        <Icon name="star" size={15} filled /> {s.stars}
                      </td>
                      <td>
                        {s.mastery === null ? (
                          <span className="muted">—</span>
                        ) : (
                          <span className={`pill is-${s.mastery >= 75 ? "good" : s.mastery >= 50 ? "mid" : "low"}`}>{s.mastery}%</span>
                        )}
                      </td>
                      <td className="num">
                        <span className={`dot${recent ? " is-on" : ""}`} aria-hidden /> {timeAgo(s.lastActiveAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {list.pages > 1 && (
          <nav className="pager" aria-label="الصفحات">
            {list.page > 1 && (
              <Link className="abtn abtn-light abtn-sm" href={href({ page: String(list.page - 1) })}>
                → السابق
              </Link>
            )}
            <span className="muted num">
              صفحة {list.page} من {list.pages}
            </span>
            {list.page < list.pages && (
              <Link className="abtn abtn-light abtn-sm" href={href({ page: String(list.page + 1) })}>
                التالي ←
              </Link>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
