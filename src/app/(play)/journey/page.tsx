import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/play/Icon";
import { ScrollToFocus } from "@/components/play/ScrollToFocus";
import { Medal, Progress, toArabic } from "@/components/play/ui";
import { TRACK_LABEL } from "@/lib/quran/labels";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export const metadata = { title: "رحلتي" };

export default async function JourneyPage() {
  const student = await getCurrentStudent();
  if (!student) redirect("/app");
  const journey = await getJourney(student);
  const current = journey.levels.find((l) => l.id === journey.currentLevelId);
  const currentStation = journey.stations.find((s) => s.stages.some((st) => st.levels.some((l) => l.id === current?.id)));
  const allDone = journey.levels.length > 0 && !current;
  // Stations climb from the bottom; scroll to where the student is now.
  const focusId = currentStation?.id ?? journey.stations.findLast((s) => s.unlocked)?.id;

  return (
    <>
      <section className="greet">
        <h1 className="page-title">أهلًا يا {student.name}</h1>
        <p className="page-sub">
          {TRACK_LABEL[student.track].icon} مسار {TRACK_LABEL[student.track].name}
        </p>
      </section>

      {current && (
        <Link href={`/play/${current.id}`} className="continue" style={{ "--c": currentStation?.color } as React.CSSProperties}>
          <span className="continue-text">
            <small>{journey.levels.some((l) => l.completed) ? "أكمل من حيث توقفت" : "أول مستوى في رحلتك"}</small>
            <b>{current.title}</b>
          </span>
          <span className="continue-play" aria-hidden>
            <Icon name="play" size={26} filled />
          </span>
        </Link>
      )}
      {allDone && (
        <div className="continue is-done">
          <span className="continue-text">
            <small>أنهيت كل المستويات المتاحة</small>
            <b>انتظر مستويات جديدة قريبًا</b>
          </span>
        </div>
      )}

      <h2 className="section-title">المحطات</h2>
      <ol className="trail">
        {journey.stations.map((st) => {
          const isCurrent = st.id === currentStation?.id;
          const state = !st.unlocked ? "locked" : st.completed ? "done" : isCurrent ? "current" : "open";
          const body = (
            <>
              <Medal color={st.color} state={state} size={68} progress={st.total ? st.done / st.total : 0}>
                <span className="medal-emoji">{st.icon}</span>
              </Medal>
              <span className="trail-card">
                <small className="trail-kicker">المحطة {toArabic(st.order)}</small>
                <b className="trail-title">{st.title}</b>
                {st.total > 0 ? (
                  <span className="trail-meta">
                    <Progress value={st.done} total={st.total} color={st.color} />
                    <span>
                      {toArabic(st.done)}/{toArabic(st.total)}
                    </span>
                  </span>
                ) : (
                  <span className="trail-soon">قريبًا</span>
                )}
                {isCurrent && <span className="here-flag">أنت هنا</span>}
              </span>
            </>
          );
          return (
            <li key={st.id} className={`trail-step is-${state}`} data-focus={st.id === focusId ? "" : undefined}>
              {st.unlocked ? (
                <Link href={`/stations/${st.id}`} className="trail-link" style={{ "--c": st.color } as React.CSSProperties}>
                  {body}
                </Link>
              ) : (
                <div className="trail-link" style={{ "--c": st.color } as React.CSSProperties} aria-label={`${st.title} — مقفولة، أكمل المحطة السابقة لتفتحها`}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <ScrollToFocus />
    </>
  );
}
