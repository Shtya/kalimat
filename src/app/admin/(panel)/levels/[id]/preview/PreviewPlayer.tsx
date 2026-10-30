"use client";
import dynamic from "next/dynamic";
import type { GameData } from "@/lib/games/types";

// The game bundle is only downloaded when an admin opens a preview.
const GameShell = dynamic(() => import("@/components/game/GameShell").then((m) => m.GameShell), {
  ssr: false,
  loading: () => <p className="muted">جارٍ تحميل المعاينة...</p>,
});

export function PreviewPlayer({ data }: { data: GameData }) {
  return <GameShell data={data} preview />;
}
