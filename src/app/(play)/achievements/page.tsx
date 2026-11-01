import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/play/Icon";
import { Medal, Progress, toArabic } from "@/components/play/ui";
import { KIND_LABEL, KINDS } from "@/lib/quran/labels";
import { getJourney } from "@/server/services/progress";
import { getKnowledge } from "@/server/services/reports";
import { getCurrentStudent } from "@/server/services/student";

export const metadata = { title: "إنجازاتي" };

/** Child-friendly wording for what each knowledge kind means. */
const KIND_FOR_KIDS = {
  MEANING: "معاني الكلمات",
  STORY: "القصص والشخصيات",
  VALUE: "القيم والأخلاق",
  THEME: "رسائل السور",
  FACT: "معلومات عن السور",
} as const;

export default async function AchievementsPage() {
  const student = await getCurrentStudent();
  if (!student) redirect("/app");
  const [journey, knowledge] = await Promise.all([getJourney(student), getKnowledge({ studentId: student.id })]);
  const stars = journey.levels.reduce((s, l) => s + l.stars, 0);
  const levelsDone = journey.levels.filter((l) => l.completed).length;
  const stagesDone = journey.stations.flatMap((s) => s.stages).filter((s) => s.completed).length;
  const kinds = KINDS.filter((k) => knowledge.byKind.get(k)?.pct !== null && knowledge.byKind.get(k)?.pct !== undefined);

  return (
    <>
      <h1 className="page-title">إنجازاتي</h1>

      <section className="trophy-hero">
        <span className="trophy-star" aria-hidden>
          <Icon name="star" size={44} filled />
        </span>
        <b className="trophy-num">{toArabic(stars)}</b>
        <span className="trophy-label">نجمة جمعتها</span>
        <div className="trophy-stats">
          <span>
            <b>{toArabic(levelsDone)}</b>
            مستوى أكملته
          </span>
          <span>
            <b>{toArabic(stagesDone)}</b>
            مرحلة أنهيتها
          </span>
          <span>
            <b>{knowledge.overall.pct === null ? "—" : `${toArabic(knowledge.overall.pct)}٪`}</b>
            إجابات صحيحة من أول مرة
          </span>
        </div>
      </section>

      <h2 className="section-title">أوسمة المحطات</h2>
      <p className="section-sub">أكمل كل مستويات المحطة لتحصل على وسامها.</p>
      <ul className="badges">
        {journey.stations.map((st) => (
          <li key={st.id} className={`badge-card${st.completed ? " is-earned" : ""}`}>
            <Medal color={st.completed ? st.color : "#c7cfe0"} size={60} state={st.completed ? "done" : st.unlocked ? "open" : "locked"}>
              <span className="medal-emoji">{st.icon}</span>
            </Medal>
            <b>المحطة {toArabic(st.order)}</b>
            {st.total > 0 ? <Progress value={st.done} total={st.total} color={st.color} /> : <small className="trail-soon">قريبًا</small>}
          </li>
        ))}
      </ul>

      <h2 className="section-title">ماذا تعلّمت؟</h2>
      {kinds.length === 0 ? (
        <div className="empty-card">
          <p>العب أول مستوى، وسنريك هنا ما تعلّمته من معاني الكلمات والقصص والقيم.</p>
          <Link href="/journey" className="btn">
            <Icon name="play" filled /> ابدأ اللعب
          </Link>
        </div>
      ) : (
        <ul className="learned">
          {kinds.map((k) => {
            const m = knowledge.byKind.get(k)!;
            return (
              <li key={k}>
                <span className="learned-icon" aria-hidden>
                  {KIND_LABEL[k].icon}
                </span>
                <span className="learned-text">
                  <b>{KIND_FOR_KIDS[k]}</b>
                  <Progress value={m.correct} total={m.answered} />
                </span>
                <span className="learned-num">
                  {toArabic(m.correct)}/{toArabic(m.answered)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
