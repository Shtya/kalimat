import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/play/Icon";
import { ScrollToFocus } from "@/components/play/ScrollToFocus";
import { UnlockFx } from "@/components/play/UnlockFx";
import { PageHead, Stars, toArabic } from "@/components/play/ui";
import { GAME_TYPE_LABEL } from "@/lib/format";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

const X = [50, 72, 50, 28]; // zig-zag columns (% of width)
const STEP = 112; // vertical distance between levels
const EDGE = 56; // space above the top level and below the first one

export const metadata = { title: "خريطة المرحلة" };

export default async function StageMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getCurrentStudent();
  if (!student) redirect("/app");
  const journey = await getJourney(student);
  const station = journey.stations.find((s) => s.stages.some((st) => st.id === id));
  const stage = station?.stages.find((st) => st.id === id);
  if (!station || !stage) notFound();
  if (!stage.unlocked) redirect(`/stations/${station.id}`);
  const levels = stage.levels;

  // The path climbs: level 1 sits at the bottom and each next level is above it.
  const height = EDGE * 2 + Math.max(0, levels.length - 1) * STEP;
  const points = levels.map((_, i) => ({ x: X[i % X.length], y: height - EDGE - i * STEP }));
  // Scroll target: the level to play now, or the top level once everything is done.
  const focusId = levels.find((l) => l.id === journey.currentLevelId)?.id ?? levels.at(-1)?.id;
  const toPath = (pts: typeof points) =>
    pts
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = pts[i - 1];
        const midY = (prev.y + p.y) / 2;
        return `C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
      })
      .join(" ");
  const path = toPath(points);
  // The travelled part of the road (up to the last open level) is drawn in solid gold.
  const lastOpen = levels.reduce((n, l, i) => (l.unlocked ? i : n), 0);
  const donePath = lastOpen > 0 ? toPath(points.slice(0, lastOpen + 1)) : null;

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
            {donePath && <path className="map-progress" d={donePath} pathLength={100} fill="none" stroke="#f5b82e" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          </svg>

          {levels.map((level, i) => {
            const isCurrent = level.id === journey.currentLevelId;
            const state = !level.unlocked ? "is-locked" : level.completed ? "is-done" : "is-current";
            const label = `المستوى ${toArabic(i + 1)}: ${level.title}${level.unlocked ? "" : " — مقفول"}`;
            const face = !level.unlocked ? <Icon name="lock" size={20} /> : isCurrent ? <Icon name="play" size={24} filled /> : toArabic(i + 1);
            return (
              <div
                key={level.id}
                className={`map-node ${state} ${points[i].x >= 50 ? "title-left" : "title-right"}`}
                style={{ left: `${points[i].x}%`, top: points[i].y }}
                data-focus={level.id === focusId ? "" : undefined}
                data-level-id={level.id}
              >
                {isCurrent && <span className="here-flag">ابدأ هنا</span>}
                {isCurrent && (
                  <span className="node-lock" aria-hidden>
                    <Icon name="lock" size={20} />
                  </span>
                )}
                {level.unlocked ? (
                  <Link href={`/play/${level.id}`} className="node-btn" aria-label={label}>
                    {face}
                  </Link>
                ) : (
                  <span className="node-btn" aria-label={label} role="img">
                    {face}
                  </span>
                )}
                {level.completed && <Stars count={level.stars} size={14} />}
                <span className="node-title">
                  {level.title}
                  <small>
                    {GAME_TYPE_LABEL[level.type].icon} {GAME_TYPE_LABEL[level.type].name}
                  </small>
                </span>
              </div>
            );
          })}
          <ScrollToFocus />
          <UnlockFx />
        </div>
      )}
    </div>
  );
}
