import { redirect } from "next/navigation";

/** Merged into «المنهج والأسئلة» (the stage picker lives there now). */
export default async function LevelsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  redirect(stage ? `/admin/content?stage=${encodeURIComponent(stage)}` : "/admin/content");
}
