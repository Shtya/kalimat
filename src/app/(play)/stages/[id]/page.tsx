import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/play/Icon";
import { PageHead, Stars, toArabic } from "@/components/play/ui";
import { GAME_TYPE_LABEL } from "@/lib/format";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

const X = [50, 74, 50, 26]; // zig-zag columns (% of width)
const STEP = 168;
const TOP = 76;

export const metadata = { title: "خريطة المرحلة" };

export default async function StageMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getCurrentStudent();
  if (!student) redirect("/");
  const journey = await getJourney(student);
  const station = journey.stations.find((s) => s.stages.some((st) => st.id === id));
  const stage = station?.stages.find((st) => st.id === id);
  if (!station || !stage) notFound();
  if (!stage.unlocked) redirect(`/stations/${station.id}`);
  const levels = stage.levels;

  const points = levels.map((_, i) => ({ x: X[i % X.length], y: TOP + i * STEP }));
  const height = TOP * 2 + Math.max(0, levels.length - 1) * STEP;
  const path = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <div style={{ "--c": station.color } as React.CSSProperties}>
      <PageHead back={`/stations/${station.id}`} backLabel={station.title} title={stage.title} sub={`المرحلة ${toArabic(stage.number)} · ${toArabic(stage.done)} من ${toArabic(stage.total)} مستويات`} />

      <details className="learn">
        <summary>
          <Icon name="book" size={20} />
          ماذا سنتعلم في هذه المرحلة؟
        </summary>
        <p>{stage.valueCluster}</p>
        <p className="learn-surahs">السور: {stage.surahs.join("، ")}</p>
      </details>

      {levels.length === 0 ? (
        <div className="state">
          <p className="state-text">نجهّز مستويات هذه المرحلة، ارجع قريبًا.</p>
        </div>
      ) : (
        <div className="map" style={{ height }}>
          <svg className="map-path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
            <path d={path} fill="none" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={path} fill="none" stroke="#e9b949" strokeOpacity=".75" strokeWidth="4" strokeDasharray="1 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {levels.map((level, i) => {
            const isCurrent = level.id === journey.currentLevelId;
            const state = !level.unlocked ? "is-locked" : level.completed ? "is-done" : "is-current";
            const label = `المستوى ${toArabic(i + 1)}: ${level.title}${level.unlocked ? "" : " — مقفول"}`;
            const face = !level.unlocked ? <Icon name="lock" size={26} /> : isCurrent ? <Icon name="play" size={30} filled /> : toArabic(i + 1);
            return (
              <div key={level.id} className={`map-node ${state}`} style={{ left: `${points[i].x}%`, top: points[i].y }}>
                {isCurrent && <span className="here-flag">ابدأ هنا</span>}
                {level.unlocked ? (
                  <Link href={`/play/${level.id}`} className="node-btn" aria-label={label}>
                    {face}
                  </Link>
                ) : (
                  <span className="node-btn" aria-label={label} role="img">
                    {face}
                  </span>
                )}
                {level.completed && <Stars count={level.stars} size={16} />}
                <span className="node-title">
                  {level.title}
                  <small>
                    {GAME_TYPE_LABEL[level.type].icon} {GAME_TYPE_LABEL[level.type].name}
                  </small>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
