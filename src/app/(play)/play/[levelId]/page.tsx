import { notFound, redirect } from "next/navigation";
import { GameShell } from "@/components/game/GameShell";
import { getPublishedLevel } from "@/server/data/content";
import { toGame } from "@/server/services/game";
import { isOfflinePrefetch } from "@/server/services/offline";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export const metadata = { title: "العب" };

export default async function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const student = await getCurrentStudent();
  if (!student) redirect("/app");
  const level = await getPublishedLevel(levelId);
  if (!level || level.words.length === 0 || (level.audience !== "ALL" && level.audience !== student.track)) notFound();
  const journey = await getJourney(student);
  if (!journey.levels.find((l) => l.id === level.id)?.unlocked && !(await isOfflinePrefetch())) redirect(`/stages/${level.stage.id}`);

  const station = journey.stations.find((st) => st.stages.some((sg) => sg.levels.some((l) => l.id === level.id)));
  const endsStation = station?.stages.flatMap((sg) => sg.levels).at(-1)?.id === level.id;
  const game = toGame(level);

  return <GameShell key={level.id} data={{ ...game, meta: { ...game.meta, endsStation } }} />;
}
