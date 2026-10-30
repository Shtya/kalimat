import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Track } from "@/lib/quran/labels";
import { scoreAttempt } from "@/lib/scoring";
import type { SubmitProgressInput } from "@/lib/validation";
import { getCurriculumTree, getPublishedLevel, type CurriculumTree } from "@/server/data/content";

type ProgressRow = { stars: number; completedAt: Date | null };

export type JourneyLevel = {
  id: string;
  title: string;
  order: number;
  type: CurriculumTree[number]["stages"][number]["levels"][number]["type"];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  surahName: string | null;
  wordCount: number;
  stars: number;
  completed: boolean;
  unlocked: boolean;
};
type Totals = { total: number; done: number; stars: number; unlocked: boolean; completed: boolean };
export type JourneyStage = Totals & { id: string; number: number; title: string; valueCluster: string; surahs: string[]; levels: JourneyLevel[] };
export type JourneyStation = Totals & { id: string; order: number; title: string; goal: string; icon: string; color: string; stages: JourneyStage[] };
export type Journey = { stations: JourneyStation[]; levels: JourneyLevel[]; currentLevelId: string | null };

const totals = (levels: JourneyLevel[]) => ({
  total: levels.length,
  done: levels.filter((l) => l.completed).length,
  stars: levels.reduce((s, l) => s + l.stars, 0),
});

/**
 * Strict order through the whole curriculum: a level opens when every level before it
 * (in earlier stations and stages too) is completed. A stage or station is open once its first level is.
 */
export function computeJourney(tree: CurriculumTree, progress: Map<string, ProgressRow>): Journey {
  const flat: JourneyLevel[] = [];
  let previousDone = true;

  const stations = tree.map((station) => {
    const stages = station.stages.map((stage) => {
      const openOnArrival = previousDone; // for stages without content yet
      const levels = stage.levels.map((l) => {
        const p = progress.get(l.id);
        const completed = !!p?.completedAt;
        const level: JourneyLevel = {
          id: l.id,
          title: l.title,
          order: l.order,
          type: l.type,
          difficulty: l.difficulty,
          surahName: l.surah?.name ?? null,
          wordCount: l._count.words,
          stars: p?.stars ?? 0,
          completed,
          unlocked: previousDone || completed,
        };
        previousDone = completed;
        flat.push(level);
        return level;
      });
      const t = totals(levels);
      return {
        id: stage.id,
        number: stage.number,
        title: stage.title,
        valueCluster: stage.valueCluster,
        surahs: stage.surahs.map((s) => s.surah.name + (s.fromAyah ? ` (${s.fromAyah}–${s.toAyah})` : "")),
        levels,
        ...t,
        unlocked: levels.length ? levels[0].unlocked : openOnArrival,
        completed: levels.length > 0 && t.done === t.total,
      };
    });
    const all = stages.flatMap((s) => s.levels);
    const t = totals(all);
    return {
      id: station.id,
      order: station.order,
      title: station.title,
      goal: station.goal,
      icon: station.icon,
      color: station.color,
      stages,
      ...t,
      unlocked: stages.some((s) => s.unlocked),
      completed: all.length > 0 && t.done === t.total,
    };
  });

  const current = flat.find((l) => l.unlocked && !l.completed) ?? null;
  return { stations, levels: flat, currentLevelId: current?.id ?? null };
}

/** Memoized per request: the layout (bottom bar, stars) and the page share one computation. */
export const getJourney = cache(async (student: { id: string; track: Track }): Promise<Journey> => {
  const [tree, rows] = await Promise.all([
    getCurriculumTree(student.track),
    db.progress.findMany({ where: { studentId: student.id }, select: { levelId: true, stars: true, completedAt: true } }),
  ]);
  return computeJourney(tree, new Map(rows.map((r) => [r.levelId, r])));
});

export type SubmitResult =
  | { ok: true; stars: number; score: number; bestStars: number; bestScore: number; nextLevelId: string | null }
  | { ok: false; error: "not_found" | "locked" | "invalid" };

export async function submitAttempt(student: { id: string; track: Track }, input: SubmitProgressInput): Promise<SubmitResult> {
  const level = await getPublishedLevel(input.levelId);
  if (!level || (level.audience !== "ALL" && level.audience !== student.track)) return { ok: false, error: "not_found" };
  if (input.wordsSolved !== level.words.length) return { ok: false, error: "invalid" };
  if (input.items) {
    const ids = new Set(level.words.map((w) => w.id));
    if (input.items.length !== level.words.length || input.items.some((i) => !ids.has(i.wordId))) return { ok: false, error: "invalid" };
  }

  const journey = await getJourney(student);
  const index = journey.levels.findIndex((l) => l.id === level.id);
  if (index < 0 || !journey.levels[index].unlocked) return { ok: false, error: "locked" };
  const nextLevelId = journey.levels[index + 1]?.id ?? null;

  const { score, stars } = scoreAttempt(level.type, level.difficulty, {
    wordCount: level.words.length,
    timeSpent: input.timeSpent,
    hintsUsed: input.hintsUsed,
    mistakes: input.mistakes,
  });

  const now = new Date();
  const existing = await db.progress.findUnique({
    where: { studentId_levelId: { studentId: student.id, levelId: level.id } },
  });

  // A re-sent offline attempt that was already stored: answer without counting it twice.
  if (existing?.lastAttemptId === input.clientAttemptId) {
    return { ok: true, stars, score, bestStars: existing.stars, bestScore: existing.score, nextLevelId };
  }

  const [saved] = await db.$transaction([
    db.progress.upsert({
      where: { studentId_levelId: { studentId: student.id, levelId: level.id } },
      create: {
        studentId: student.id,
        levelId: level.id,
        stars,
        score,
        attempts: 1,
        timeSpent: input.timeSpent,
        completedAt: now,
        lastAttemptId: input.clientAttemptId,
      },
      update: {
        stars: Math.max(stars, existing?.stars ?? 0),
        score: Math.max(score, existing?.score ?? 0),
        attempts: { increment: 1 },
        timeSpent: { increment: input.timeSpent },
        completedAt: existing?.completedAt ?? now,
        lastAttemptId: input.clientAttemptId,
      },
    }),
    db.student.update({ where: { id: student.id }, data: { lastActiveAt: now } }),
    db.itemResult.createMany({
      data: (input.items ?? []).map((i) => ({
        studentId: student.id,
        wordId: i.wordId,
        levelId: level.id,
        correct: i.mistakes === 0 && i.hints === 0,
        mistakes: i.mistakes,
        hintsUsed: i.hints,
        createdAt: now,
      })),
    }),
  ]);

  return { ok: true, stars, score, bestStars: saved.stars, bestScore: saved.score, nextLevelId };
}
