import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Dropdown } from "@/components/admin/Dropdown";
import { TRACK_LABEL, TRACKS, type Track } from "@/lib/quran/labels";
import { timeAgo } from "@/lib/format";
import { listStudents } from "@/server/services/reports";
import { deleteStudent } from "../../actions";

export const metadata = { title: "الطلاب" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; track?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 40) || undefined;
  const track = TRACKS.includes(sp.track as Track) ? (sp.track as Track) : undefined;
  const list = await listStudents({ q, track, page: Number(sp.page) || 1 });
  const pageHref = (page: number) => `/admin/students?${new URLSearchParams({ ...(q ? { q } : {}), ...(track ? { track } : {}), page: String(page) })}`;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>الطلاب</h1>
          <p>{list.total} طالب</p>
        </div>
      </div>

      <form className="filters" method="get" role="search">
        <label className="fld">
          بحث بالاسم
          <input name="q" defaultValue={q} placeholder="اسم الطالب" />
        </label>
        <div className="fld">
          المسار
          <Dropdown
            name="track"
            defaultValue={track ?? ""}
            options={[{ value: "", label: "كل المسارات" }, ...TRACKS.map((t) => ({ value: t, label: TRACK_LABEL[t].name }))]}
          />
        </div>
        <button className="abtn">بحث</button>
        {(q || track) && (
          <Link href="/admin/students" className="abtn abtn-light">
            مسح
          </Link>
        )}
      </form>

      <section className="panel">
        {list.rows.length === 0 ? (
          <p className="muted">لا يوجد طلاب مطابقون.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المسار</th>
                  <th>مستويات مكتملة</th>
                  <th>النجوم</th>
                  <th>النقاط</th>
                  <th>آخر نشاط</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/students/${s.id}`} className="row-link">
                        {s.name}
                      </Link>
                    </td>
                    <td className="muted">{TRACK_LABEL[s.track].name}</td>
                    <td className="num">{s.completed}</td>
                    <td className="num" style={{ color: "var(--gold-deep)" }}>
                      ★ {s.stars}
                    </td>
                    <td className="num">{s.score}</td>
                    <td className="num muted">{timeAgo(s.lastActiveAt)}</td>
                    <td>
                      <ActionForm action={deleteStudent.bind(null, s.id)} confirm={`حذف "${s.name}" وكل تقدمه؟`} className="actions">
                        <SubmitButton className="abtn abtn-danger abtn-sm">حذف</SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.pages > 1 && (
          <nav className="pager" aria-label="الصفحات">
            {list.page > 1 && (
              <Link className="abtn abtn-light abtn-sm" href={pageHref(list.page - 1)}>
                → السابق
              </Link>
            )}
            <span className="muted num">
              {list.page} / {list.pages}
            </span>
            {list.page < list.pages && (
              <Link className="abtn abtn-light abtn-sm" href={pageHref(list.page + 1)}>
                التالي ←
              </Link>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
