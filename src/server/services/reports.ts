import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Kind, Track } from "@/lib/quran/labels";

/** Everything the dashboard home needs: headline numbers, the curriculum matrix and what needs attention. */
export async function getOverview() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [students, activeThisWeek, inactive, completedThisWeek, drafts, stations, recent, knowledge, hardest] = await Promise.all([
    db.student.count(),
    db.student.count({ where: { lastActiveAt: { gte: weekAgo } } }),
    db.student.count({ where: { lastActiveAt: { lt: weekAgo } } }),
    db.progress.count({ where: { completedAt: { gte: weekAgo } } }),
    db.level.count({ where: { status: "DRAFT" } }),
    db.station.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        title: true,
        icon: true,
        color: true,
        stages: {
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            title: true,
            levels: { where: { status: "PUBLISHED" }, select: { _count: { select: { words: true } } } },
          },
        },
      },
    }),
    db.progress.findMany({
      where: { completedAt: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        stars: true,
        updatedAt: true,
        student: { select: { id: true, name: true } },
        level: { select: { title: true, stage: { select: { number: true } } } },
      },
    }),
    getKnowledge({}),
    getHardestQuestions({}, 3, 1),
  ]);

  const matrix = stations.map((st) => ({
    ...st,
    stages: st.stages.map((s) => ({
      id: s.id,
      number: s.number,
      title: s.title,
      levels: s.levels.length,
      questions: s.levels.reduce((n, l) => n + l._count.words, 0),
      mastery: knowledge.byStage.get(s.id) ?? null,
    })),
  }));
  const allStages = matrix.flatMap((s) => s.stages);
  const readyStages = allStages.filter((s) => s.levels > 0).length;

  return {
    students,
    activeThisWeek,
    inactive,
    completedThisWeek,
    drafts,
    mastery: knowledge.overall,
    readyStages,
    totalStages: allStages.length,
    nextEmptyStage: allStages.find((s) => s.levels === 0) ?? null,
    matrix,
    recent,
    hardest: hardest[0] ?? null,
  };
}

// ───────────── Knowledge measurement ─────────────

/** Share of questions answered on the first try without hints (0–100), or null when nothing was answered. */
export type Mastery = { answered: number; correct: number; pct: number | null };
const mastery = (answered: number, correct: number): Mastery => ({ answered, correct, pct: answered ? Math.round((correct / answered) * 100) : null });

type LatestResult = { studentId: string; wordId: string; correct: boolean; kind: Kind; surahNumber: number | null; stageId: string };

/** The latest result of each (student, question) pair — retries replace older answers. */
async function latestResults(filter: { track?: Track; studentId?: string; studentIds?: string[] }): Promise<LatestResult[]> {
  if (filter.studentIds && filter.studentIds.length === 0) return [];
  const conditions = [Prisma.sql`TRUE`];
  if (filter.track) conditions.push(Prisma.sql`s."track"::text = ${filter.track}`);
  if (filter.studentId) conditions.push(Prisma.sql`r."studentId" = ${filter.studentId}`);
  if (filter.studentIds) conditions.push(Prisma.sql`r."studentId" IN (${Prisma.join(filter.studentIds)})`);
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
    overall: { ...mastery(rows.length, rows.filter((r) => r.correct).length), students: new Set(rows.map((r) => r.studentId)).size },
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

export const STUDENT_STATUSES = ["active", "idle", "new"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];
export const STUDENT_SORTS = ["recent", "joined", "progress", "name"] as const;
export type StudentSort = (typeof STUDENT_SORTS)[number];

const WEEK = 7 * 86_400_000;

/** active: played this week · idle: no play for a week or more · new: signed up but finished no level yet. */
function statusWhere(status: StudentStatus | undefined): Prisma.StudentWhereInput {
  const weekAgo = new Date(Date.now() - WEEK);
  if (status === "active") return { lastActiveAt: { gte: weekAgo }, progress: { some: { completedAt: { not: null } } } };
  if (status === "idle") return { lastActiveAt: { lt: weekAgo }, progress: { some: { completedAt: { not: null } } } };
  if (status === "new") return { progress: { none: { completedAt: { not: null } } } };
  return {};
}

const ORDER: Record<StudentSort, Prisma.StudentOrderByWithRelationInput[]> = {
  recent: [{ lastActiveAt: "desc" }],
  joined: [{ createdAt: "desc" }],
  progress: [{ progress: { _count: "desc" } }, { lastActiveAt: "desc" }],
  name: [{ name: "asc" }],
};

export type StudentFilter = { q?: string; track?: Track; status?: StudentStatus; sort?: StudentSort };

function studentWhere(opts: StudentFilter): Prisma.StudentWhereInput {
  return {
    ...(opts.track ? { track: opts.track } : {}),
    ...(opts.q ? { name: { contains: opts.q, mode: "insensitive" } } : {}),
    ...statusWhere(opts.status),
  };
}

/** Published levels a student of each track can play (the denominator of their progress bar). */
async function levelsPerTrack(): Promise<Record<Track, number>> {
  const [child, youth] = await Promise.all(
    (["CHILD", "YOUTH"] as const).map((t) => db.level.count({ where: { status: "PUBLISHED", audience: { in: ["ALL", t] }, stage: { status: "PUBLISHED", station: { status: "PUBLISHED" } } } })),
  );
  return { CHILD: child, YOUTH: youth };
}

/** Totals with completed levels, stars, score and mastery for a set of students. */
async function studentTotals(ids: string[]) {
  const [totals, results] = await Promise.all([
    db.progress.groupBy({
      by: ["studentId"],
      where: { studentId: { in: ids }, completedAt: { not: null } },
      _sum: { stars: true, score: true },
      _count: { _all: true },
    }),
    latestResults({ studentIds: ids }),
  ]);
  const byStudent = new Map(totals.map((x) => [x.studentId, x]));
  const mastered = groupMastery(results, (r) => r.studentId);
  return (id: string) => ({
    completed: byStudent.get(id)?._count._all ?? 0,
    stars: byStudent.get(id)?._sum.stars ?? 0,
    score: byStudent.get(id)?._sum.score ?? 0,
    mastery: mastered.get(id)?.pct ?? null,
  });
}

export async function listStudents(opts: StudentFilter & { page?: number }) {
  const where = studentWhere(opts);
  const page = Math.max(1, opts.page ?? 1);
  const [total, rows, perTrack] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      orderBy: ORDER[opts.sort ?? "recent"],
      skip: (page - 1) * STUDENTS_PAGE_SIZE,
      take: STUDENTS_PAGE_SIZE,
      select: { id: true, name: true, track: true, lastActiveAt: true, createdAt: true },
    }),
    levelsPerTrack(),
  ]);
  const totals = await studentTotals(rows.map((r) => r.id));
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE)),
    rows: rows.map((r) => ({ ...r, ...totals(r.id), available: perTrack[r.track] })),
  };
}

/** Headline counts for the students page (not affected by its filters). */
export async function getStudentSummary() {
  const counts = await Promise.all([
    db.student.count(),
    ...STUDENT_STATUSES.map((s) => db.student.count({ where: statusWhere(s) })),
    db.student.count({ where: { track: "CHILD" } }),
  ]);
  const [total, active, idle, fresh, child] = counts;
  return { total, active, idle, new: fresh, CHILD: child, YOUTH: total - child };
}

/** Every matching student with their totals, for the Excel export (names only, no contact details). */
export async function exportStudents(opts: StudentFilter) {
  const rows = await db.student.findMany({
    where: studentWhere(opts),
    orderBy: ORDER[opts.sort ?? "recent"],
    take: 5000,
    select: { id: true, name: true, track: true, lastActiveAt: true, createdAt: true },
  });
  const totals = await studentTotals(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, ...totals(r.id) }));
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
