import { redirect } from "next/navigation";
import { AccountForm } from "@/components/play/AccountForm";
import { SoundToggle } from "@/components/play/SoundToggle";
import { TRACK_LABEL } from "@/lib/quran/labels";
import { getCurrentStudent } from "@/server/services/student";

export const metadata = { title: "حسابي" };

export default async function SettingsPage() {
  const student = await getCurrentStudent();
  if (!student) redirect("/app");
  const saved = !!(student.phone || student.email);

  return (
    <>
      <h1 className="page-title">حسابي</h1>

      <section className="profile">
        <span className="profile-avatar" aria-hidden>
          {Array.from(student.name)[0]}
        </span>
        <span className="profile-text">
          <b>{student.name}</b>
          <small>
            {TRACK_LABEL[student.track].icon} مسار {TRACK_LABEL[student.track].name} · {TRACK_LABEL[student.track].ages}
          </small>
        </span>
      </section>

      <h2 className="section-title">احفظ حسابك</h2>
      <p className="section-sub">{saved ? "حسابك محفوظ. ادخل بنفس الرقم أو البريد على أي جهاز لتجد نجومك." : "أضف رقم موبايل أو بريدًا، لتعود إلى نجومك من أي جهاز."}</p>
      <AccountForm phone={student.phone} email={student.email} />

      <h2 className="section-title">الإعدادات</h2>
      <SoundToggle variant="row" />
    </>
  );
}
