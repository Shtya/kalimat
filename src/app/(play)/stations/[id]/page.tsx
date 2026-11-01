import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/play/Icon";
import { Medal, Progress, toArabic } from "@/components/play/ui";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export const metadata = { title: "المحطة" };

export default async function StationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getCurrentStudent();
  if (!student) redirect("/app");
  const journey = await getJourney(student);
  const station = journey.stations.find((s) => s.id === id);
  if (!station) notFound();
  if (!station.unlocked) redirect("/journey");

  return (
    <div style={{ "--c": station.color } as React.CSSProperties}>
      <header className="banner">
        <Link href="/journey" className="back-btn on-color" aria-label="رجوع إلى المحطات">
          <Icon name="forward" size={20} />
        </Link>
        <Medal color="#ffffff" size={64} state="open">
          <span className="medal-emoji">{station.icon}</span>
        </Medal>
        <div className="banner-text">
          <small>المحطة {toArabic(station.order)}</small>
          <h1>{station.title}</h1>
        </div>
        <p className="banner-goal">{station.goal}</p>
      </header>

      <ol className="steps">
        {station.stages.map((stage) => {
          const playable = stage.unlocked && stage.total > 0;
          const state = !stage.unlocked ? "locked" : stage.completed ? "done" : stage.total === 0 ? "soon" : "open";
          const shown = stage.surahs.slice(0, 4);
          const body = (
            <>
              <span className="step-num" aria-hidden>
                {state === "locked" ? <Icon name="lock" size={18} /> : state === "done" ? <Icon name="check" size={20} /> : toArabic(stage.number)}
              </span>
              <span className="step-card">
                <small className="step-kicker">المرحلة {toArabic(stage.number)}</small>
                <b className="step-title">{stage.title}</b>
                <span className="chips">
                  {shown.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                  {stage.surahs.length > shown.length && <span className="chip is-more">+{toArabic(stage.surahs.length - shown.length)} سورة</span>}
                </span>
                {state === "soon" ? (
                  <span className="trail-soon">قريبًا — نجهّز مستويات هذه المرحلة</span>
                ) : state === "locked" ? (
                  <span className="step-locked">تُفتح بعد إكمال المرحلة السابقة</span>
                ) : (
                  <span className="trail-meta">
                    <Progress value={stage.done} total={stage.total} />
                    <span>
                      {toArabic(stage.done)}/{toArabic(stage.total)}
                    </span>
                    <span className="star-mini">
                      <Icon name="star" size={14} filled />
                      {toArabic(stage.stars)}
                    </span>
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li key={stage.id} className={`step is-${state}`}>
              {playable ? (
                <Link href={`/stages/${stage.id}`} className="step-link">
                  {body}
                </Link>
              ) : (
                <div className="step-link">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
