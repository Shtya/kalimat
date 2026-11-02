import "server-only";
import { headers } from "next/headers";
import type { Journey } from "./progress";

/** Header the service worker sets when it downloads pages for offline play (see public/sw.js). */
export const PREFETCH_HEADER = "x-kq-prefetch";

/**
 * True while the service worker is downloading pages ahead of time. Pages then render levels and stages
 * that are still locked instead of redirecting, so they are ready once the child unlocks them offline.
 * Nothing is trusted from this: results are still checked against the real progress when they are sent.
 */
export async function isOfflinePrefetch() {
  return (await headers()).get(PREFETCH_HEADER) === "1";
}

/** Levels kept ready around the current one: a few behind (replays) and the next ones ahead. */
const BEHIND = 20;
const AHEAD = 15;

/** Everything a student may open without internet: the main screens plus the maps and levels around where they are. */
export function offlineUrls(journey: Journey): string[] {
  const urls = new Set(["/journey", "/achievements", "/settings", "/offline"]);
  const order = journey.stations.flatMap((station) => station.stages.flatMap((stage) => stage.levels.map((level) => ({ level, stage, station }))));
  const current = journey.currentLevelId ? order.findIndex((o) => o.level.id === journey.currentLevelId) : order.length - 1;
  for (const { level, stage, station } of order.slice(Math.max(0, current - BEHIND), current + AHEAD + 1)) {
    urls.add(`/stations/${station.id}`);
    urls.add(`/stages/${stage.id}`);
    urls.add(`/play/${level.id}`);
  }
  return [...urls];
}
