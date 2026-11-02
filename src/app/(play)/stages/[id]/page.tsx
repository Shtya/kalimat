import { notFound, redirect } from "next/navigation";
import { MapNode } from "@/components/play/MapNode";
import { ScrollToFocus } from "@/components/play/ScrollToFocus";
import { UnlockFx } from "@/components/play/UnlockFx";
import { MapHead, toArabic } from "@/components/play/ui";
import { GAME_TYPE_LABEL } from "@/lib/format";
import { isOfflinePrefetch } from "@/server/services/offline";
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
  if (!stage.unlocked && !(await isOfflinePrefetch())) redirect(`/stations/${station.id}`);
  const levels = stage.levels;
  const totalStars = journey.levels.reduce((s, l) => s + l.stars, 0);

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
      <MapHead
        back={`/stations/${station.id}`}
        backLabel={station.title}
        // RLM keeps the two numbers on either side of «·» from merging into one bidi run
        kicker={`المرحلة ${toArabic(stage.number)}‏ · ${toArabic(stage.done)} من ${toArabic(stage.total)} مستويات`}
        title={stage.title}
        stars={totalStars}
        infoLabel="ماذا سنتعلم في هذه المرحلة؟"
        info={
          <>
            <p>{stage.valueCluster}</p>
            <p className="mh-pop-sub">السور: {stage.surahs.join("، ")}</p>
          </>
        }
      />

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

          {levels.map((level, i) => (
            <MapNode
              key={level.id}
              id={level.id}
              number={i + 1}
              title={level.title}
              kind={`${GAME_TYPE_LABEL[level.type].icon} ${GAME_TYPE_LABEL[level.type].name}`}
              x={points[i].x}
              y={points[i].y}
              stars={level.stars}
              focus={level.id === focusId}
            />
          ))}
          <ScrollToFocus />
          <UnlockFx />
        </div>
      )}
    </div>
  );
}
