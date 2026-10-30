import "server-only";
import { db } from "@/lib/db";
import type { ParsedLevel } from "./parse";

export type ApplySummary = { levelsCreated: number; levelsUpdated: number; questionsCreated: number; questionsUpdated: number; questionsRemoved: number };

/**
 * Writes parsed levels. A level is matched by (stage number, level order): it is updated in place and its
 * questions are matched by position, so students' results on unchanged questions are kept. Each level is
 * its own transaction — a failure leaves earlier levels written and reports which one failed.
 */
export async function applyImport(levels: ParsedLevel[], publish: boolean): Promise<ApplySummary> {
  const summary: ApplySummary = { levelsCreated: 0, levelsUpdated: 0, questionsCreated: 0, questionsUpdated: 0, questionsRemoved: 0 };
  const stages = new Map((await db.stage.findMany({ select: { id: true, number: true } })).map((s) => [s.number, s.id]));

  for (const lv of levels) {
    const stageId = stages.get(lv.stage);
    if (!stageId) throw new Error(`المرحلة ${lv.stage} غير موجودة في قاعدة البيانات.`);

    await db.$transaction(async (tx) => {
      const fields = { title: lv.title, type: lv.type, difficulty: lv.difficulty, audience: lv.audience, surahNumber: lv.surahNumber };
      const existing = await tx.level.findUnique({ where: { stageId_order: { stageId, order: lv.order } }, select: { id: true, status: true } });
      const level = existing
        ? await tx.level.update({ where: { id: existing.id }, data: { ...fields, status: publish ? "PUBLISHED" : existing.status } })
        : await tx.level.create({ data: { ...fields, stageId, order: lv.order, status: publish ? "PUBLISHED" : "DRAFT" } });
      if (existing) summary.levelsUpdated++;
      else summary.levelsCreated++;

      const current = await tx.word.findMany({ where: { levelId: level.id }, orderBy: { order: "asc" }, select: { id: true } });
      for (const [i, item] of lv.items.entries()) {
        const data = { text: item.text, hint: item.hint, fact: item.fact, kind: item.kind, surahNumber: item.surahNumber, ayah: item.ayah, quranText: item.quranText, order: i + 1 };
        if (current[i]) {
          await tx.word.update({ where: { id: current[i].id }, data });
          summary.questionsUpdated++;
        } else {
          await tx.word.create({ data: { ...data, levelId: level.id } });
          summary.questionsCreated++;
        }
      }
      const extra = current.slice(lv.items.length).map((w) => w.id);
      if (extra.length) {
        await tx.word.deleteMany({ where: { id: { in: extra } } });
        summary.questionsRemoved += extra.length;
      }
    });
  }
  return summary;
}
