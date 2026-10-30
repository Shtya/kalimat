import { notFound, redirect } from "next/navigation";
import { GameShell } from "@/components/game/GameShell";
import { getPublishedLevel } from "@/server/data/content";
import { toGame } from "@/server/services/game";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export const metadata = { title: "العب" };

export default async function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const student = await getCurrentStudent();
  if (!student) redirect("/");
  const level = await getPublishedLevel(levelId);
  if (!level || level.words.length === 0 || (level.audience !== "ALL" && level.audience !== student.track)) notFound();
  const journey = await getJourney(student);
  if (!journey.levels.find((l) => l.id === level.id)?.unlocked) redirect(`/stages/${level.stage.id}`);

  return <GameShell key={level.id} data={toGame(level)} />;
}
