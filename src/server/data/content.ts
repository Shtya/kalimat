import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { Track } from "@/lib/quran/labels";

// Published content changes rarely, so student-facing lists are cached and
// invalidated by tag whenever an admin mutates content (see contentChanged in admin actions).
export const CONTENT_TAG = "content";
const cache = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) =>
  unstable_cache(fn, [key], { tags: [CONTENT_TAG], revalidate: process.env.NODE_ENV === "production" ? 3600 : 5 });

/**
 * The whole published curriculum for one age track: stations → stages → levels (+ the stage's surahs).
 * One small cached tree drives the station list, the maps and the in-order unlocking.
 */
export const getCurriculumTree = cache(
  (track: Track) =>
    db.station.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        title: true,
        goal: true,
        icon: true,
        color: true,
        stages: {
          where: { status: "PUBLISHED" },
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            title: true,
            valueCluster: true,
            surahs: { orderBy: { order: "asc" }, select: { fromAyah: true, toAyah: true, surah: { select: { number: true, name: true } } } },
            levels: {
              where: { status: "PUBLISHED", audience: { in: ["ALL", track] }, words: { some: {} } },
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
                type: true,
                difficulty: true,
                surah: { select: { name: true } },
                _count: { select: { words: true } },
              },
            },
          },
        },
      },
    }),
  "curriculum-tree",
);
export type CurriculumTree = Awaited<ReturnType<typeof getCurriculumTree>>;

const playableSelect = {
  id: true,
  title: true,
  type: true,
  difficulty: true,
  audience: true,
  status: true,
  config: true,
  stageId: true,
  stage: { select: { id: true, number: true, title: true, station: { select: { title: true, color: true } } } },
  words: {
    orderBy: { order: "asc" as const },
    select: { id: true, text: true, hint: true, fact: true, kind: true, ayah: true, quranText: true, surah: { select: { name: true } } },
  },
};

export const getPublishedLevel = cache(
  (levelId: string) =>
    db.level.findFirst({
      where: { id: levelId, status: "PUBLISHED", stage: { status: "PUBLISHED", station: { status: "PUBLISHED" } } },
      select: playableSelect,
    }),
  "level",
);

/** Uncached, includes drafts — for the admin preview. */
export function getLevelForPreview(levelId: string) {
  return db.level.findUnique({ where: { id: levelId }, select: playableSelect });
}

export type PlayableLevel = NonNullable<Awaited<ReturnType<typeof getLevelForPreview>>>;
