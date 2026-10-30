import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Kind, Track } from "@/lib/quran/labels";

export async function getOverview() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [students, activeThisWeek, scoreAgg, completions, recent, levelStats, mastery] = await Promise.all([
    db.student.count(),
    db.student.count({ where: { lastActiveAt: { gte: weekAgo } } }),
    db.progress.aggregate({ _avg: { score: true, stars: true }, where: { completedAt: { not: null } } }),
    db.progress.count({ where: { completedAt: { not: null } } }),
    db.progress.findMany({
      where: { completedAt: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        stars: true,
        score: true,
        updatedAt: true,
        student: { select: { id: true, name: true } },
        level: { select: { title: true, stage: { select: { number: true, title: true } } } },
      },
    }),
    db.progress.groupBy({
      by: ["levelId"],
      where: { completedAt: { not: null } },
      _avg: { stars: true, attempts: true },
      _count: { _all: true },
      having: { levelId: { _count: { gte: 2 } } },
      orderBy: [{ _avg: { stars: "asc" } }],
      take: 6,
    }),
    getKnowledge({}),
  ]);

  const levels = await db.level.findMany({
    where: { id: { in: levelStats.map((s) => s.levelId) } },
    select: { id: true, title: true, stage: { select: { number: true, title: true } } },
  });
  const byId = new Map(levels.map((l) => [l.id, l]));
  const hardest = levelStats
    .map((s) => ({
      level: byId.get(s.levelId),
      avgStars: s._avg.stars ?? 0,
      avgAttempts: s._avg.attempts ?? 0,
      players: s._count._all,
    }))
    .filter((s) => s.level)
    .sort((a, b) => a.avgStars - b.avgStars || b.avgAttempts - a.avgAttempts);

  return {
    students,
    activeThisWeek,
    completions,
    avgScore: Math.round(scoreAgg._avg.score ?? 0),
    avgStars: Number((scoreAgg._avg.stars ?? 0).toFixed(1)),
    mastery: mastery.overall,
    recent,
    hardest,
  };
}

// ───────────── Knowledge measurement ─────────────

/** Share of questions answered on the first try without hints (0–100), or null when nothing was answered. */
export type Mastery = { answered: number; correct: number; pct: number | null };
const mastery = (answered: number, correct: number): Mastery => ({ answered, correct, pct: answered ? Math.round((correct / answered) * 100) : null });

type LatestResult = { studentId: string; wordId: string; correct: boolean; kind: Kind; surahNumber: number | null; stageId: string };

/** The latest result of each (student, question) pair — retries replace older answers. */
async function latestResults(filter: { track?: Track; studentId?: string }): Promise<LatestResult[]> {
  const conditions = [Prisma.sql`TRUE`];
  if (filter.track) conditions.push(Prisma.sql`s."track"::text = ${filter.track}`);
  if (filter.studentId) conditions.push(Prisma.sql`r."studentId" = ${filter.studentId}`);
  return db.$queryRaw<LatestResult[]>`
    SELECT DISTINCT ON (r."studentId", r."wordId")
      r."studentId", r."wordId", r."correct", w."kind"::text AS "kind", w."surahNumber", l."stageId"
    FROM "ItemResult" r
    JOIN "Word" w ON w."id" = r."wordId"
    JOIN "Level" l ON l."id" = r."levelId"
    JOIN "Student" s ON s."id" = r."studentId"
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY r."studentId", r."wordId", r."createdAt" DESC`;
}

function groupMastery<K extends string | number>(rows: LatestResult[], key: (r: LatestResult) => K | null) {
  const map = new Map<K, { answered: number; correct: number; students: Set<string> }>();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    const g = map.get(k) ?? { answered: 0, correct: 0, students: new Set<string>() };
    g.answered++;
    if (r.correct) g.correct++;
    g.students.add(r.studentId);
    map.set(k, g);
  }
  return new Map([...map].map(([k, g]) => [k, { ...mastery(g.answered, g.correct), students: g.students.size }]));
}

/** Mastery by stage, surah and knowledge kind (for all students, a track, or one student). */
export async function getKnowledge(filter: { track?: Track; studentId?: string }) {
  const rows = await latestResults(filter);
  return {
    overall: mastery(rows.length, rows.filter((r) => r.correct).length),
    byStage: groupMastery(rows, (r) => r.stageId),
    bySurah: groupMastery(rows, (r) => r.surahNumber),
    byKind: groupMastery(rows, (r) => r.kind),
  };
}

/** Questions most often missed on the first try (at least `min` students answered). */
export async function getHardestQuestions(filter: { track?: Track }, min = 3, take = 15) {
  const rows = await latestResults(filter);
  const byWord = groupMastery(rows, (r) => r.wordId);
  const candidates = [...byWord].filter(([, m]) => m.answered >= min).sort((a, b) => (a[1].pct ?? 0) - (b[1].pct ?? 0)).slice(0, take);
  const words = await db.word.findMany({
    where: { id: { in: candidates.map(([id]) => id) } },
    select: { id: true, text: true, hint: true, kind: true, ayah: true, surah: { select: { name: true } }, level: { select: { id: true, title: true, stage: { select: { number: true } } } } },
  });
  const byId = new Map(words.map((w) => [w.id, w]));
  return candidates.flatMap(([id, m]) => {
    const word = byId.get(id);
    return word ? [{ ...m, word }] : [];
  });
}

// ───────────── Students ─────────────

export const STUDENTS_PAGE_SIZE = 20;

export async function listStudents(opts: { q?: string; track?: Track; page?: number }) {
  const where: Prisma.StudentWhereInput = {
    ...(opts.track ? { track: opts.track } : {}),
    ...(opts.q ? { name: { contains: opts.q, mode: "insensitive" } } : {}),
  };
  const page = Math.max(1, opts.page ?? 1);
  const [total, rows] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      orderBy: { lastActiveAt: "desc" },
      skip: (page - 1) * STUDENTS_PAGE_SIZE,
      take: STUDENTS_PAGE_SIZE,
      select: { id: true, name: true, track: true, lastActiveAt: true },
    }),
  ]);
  const totals = await db.progress.groupBy({
    by: ["studentId"],
    where: { studentId: { in: rows.map((r) => r.id) }, completedAt: { not: null } },
    _sum: { stars: true, score: true },
    _count: { _all: true },
  });
  const t = new Map(totals.map((x) => [x.studentId, x]));
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE)),
    rows: rows.map((r) => ({
      ...r,
      completed: t.get(r.id)?._count._all ?? 0,
      stars: t.get(r.id)?._sum.stars ?? 0,
      score: t.get(r.id)?._sum.score ?? 0,
    })),
  };
}

export async function getStudentDetail(id: string) {
  const student = await db.student.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      track: true,
      phone: true,
      email: true,
      createdAt: true,
      lastActiveAt: true,
      progress: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          stars: true,
          score: true,
          attempts: true,
          timeSpent: true,
          completedAt: true,
          updatedAt: true,
          level: { select: { id: true, title: true, order: true, stage: { select: { number: true, title: true } } } },
        },
      },
    },
  });
  if (!student) return null;
  const done = student.progress.filter((p) => p.completedAt);
  return {
    ...student,
    lastLevel: student.progress[0]?.level ?? null,
    knowledge: await getKnowledge({ studentId: id }),
    totals: {
      completed: done.length,
      stars: done.reduce((s, p) => s + p.stars, 0),
      score: done.reduce((s, p) => s + p.score, 0),
      attempts: student.progress.reduce((s, p) => s + p.attempts, 0),
      timeSpent: student.progress.reduce((s, p) => s + p.timeSpent, 0),
    },
  };
}
