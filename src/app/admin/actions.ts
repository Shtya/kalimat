"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z, ZodTypeAny } from "zod";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { WORD_LIMITS } from "@/lib/scoring";
import { GAME_TYPE_LABEL } from "@/lib/format";
import { levelSchema, loginSchema, stageSchema, stationSchema, wordSchema } from "@/lib/validation";
import { CONTENT_TAG } from "@/server/data/content";
import { applyImport, type ApplySummary } from "@/server/import/apply";
import { readSheet } from "@/server/import/excel";
import { parseRows, type Issue } from "@/server/import/parse";
import { createSession, destroySession, requireAdmin, verifyCredentials } from "@/server/services/auth";

export type ActionState = { ok?: string; error?: string; at?: number };

const fail = (error: string): ActionState => ({ error, at: Date.now() });
const done = (ok: string): ActionState => ({ ok, at: Date.now() });

function parse<S extends ZodTypeAny>(schema: S, form: FormData): { data: z.output<S> } | { error: ActionState } {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: fail(parsed.error.issues[0].message) };
  }
  return { data: parsed.data };
}

/** Content changed → drop the cached student-facing lists. */
function contentChanged() {
  revalidateTag(CONTENT_TAG);
  revalidatePath("/admin", "layout");
}

function dbError(e: unknown): ActionState {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2003") return fail("لا يمكن الحذف: هناك بيانات مرتبطة.");
    if (e.code === "P2002") return fail("رقم المستوى مستخدم بالفعل في هذه المرحلة.");
    if (e.code === "P2025") return fail("العنصر غير موجود.");
  }
  console.error(e);
  return fail("حدث خطأ غير متوقع.");
}

// ───────────── Auth ─────────────

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, password } = parsed.data;

  const byIp = rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
  const byEmail = rateLimit(`login-email:${email}`, 5, 15 * 60_000);
  if (!byIp.ok || !byEmail.ok) return fail("محاولات كثيرة. حاول بعد ١٥ دقيقة.");

  const admin = await verifyCredentials(email, password);
  if (!admin) return fail("البريد أو كلمة المرور غير صحيحة.");
  await createSession(admin.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

// ───────────── Curriculum (stations & stages) ─────────────

export async function saveStation(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = parse(stationSchema, form);
  if ("error" in p) return p.error;
  try {
    await db.station.update({ where: { id }, data: p.data });
  } catch (e) {
    return dbError(e);
  }
  contentChanged();
  return done("تم حفظ المحطة");
}

export async function saveStage(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = parse(stageSchema, form);
  if ("error" in p) return p.error;
  try {
    await db.stage.update({ where: { id }, data: p.data });
  } catch (e) {
    return dbError(e);
  }
  contentChanged();
  return done("تم حفظ المرحلة");
}

// ───────────── Excel import ─────────────

export type ImportState = ActionState & {
  checked?: boolean;
  rowCount?: number;
  levels?: { stage: number; order: number; title: string; type: string; questions: number; exists: boolean }[];
  errors?: Issue[];
  warnings?: Issue[];
  summary?: ApplySummary;
};

const MAX_UPLOAD = 5 * 1024 * 1024;

/** Validates the uploaded sheet (intent=check) or validates and writes it (intent=apply). */
export async function importAction(_: ImportState, form: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ...fail("اختر ملف Excel أولًا.") };
  if (file.size > MAX_UPLOAD) return { ...fail("حجم الملف أكبر من 5 ميجابايت.") };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { ...fail("الملف يجب أن يكون ‎.xlsx‎ أو ‎.csv‎.") };

  const read = await readSheet(file);
  if ("error" in read) return { ...fail(read.error) };
  const parsed = parseRows(read.rows);
  if (read.unknown.length) parsed.warnings.unshift({ row: 1, message: `أعمدة غير معروفة وسيتم تجاهلها: ${read.unknown.join("، ")}.` });

  const existing = new Set(
    (await db.level.findMany({ select: { order: true, stage: { select: { number: true } } } })).map((l) => `${l.stage.number}:${l.order}`),
  );
  const levels = parsed.levels.map((l) => ({
    stage: l.stage,
    order: l.order,
    title: l.title,
    type: GAME_TYPE_LABEL[l.type].name,
    questions: l.items.length,
    exists: existing.has(`${l.stage}:${l.order}`),
  }));
  const report = { checked: true, rowCount: parsed.rowCount, levels, errors: parsed.errors, warnings: parsed.warnings, at: Date.now() };

  if (parsed.errors.length) return { ...report, error: `في الملف ${parsed.errors.length} خطأ — صحّحها وارفع الملف مرة أخرى.` };
  if (form.get("intent") !== "apply") return { ...report, ok: "الملف سليم وجاهز للاستيراد." };

  try {
    const summary = await applyImport(parsed.levels, form.get("publish") === "on");
    contentChanged();
    return { ...report, summary, ok: "تم الاستيراد بنجاح." };
  } catch (e) {
    console.error(e);
    return { ...report, error: e instanceof Error ? e.message : "تعذّر الاستيراد." };
  }
}

// ───────────── Levels ─────────────

export async function saveLevel(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = parse(levelSchema, form);
  if ("error" in p) return p.error;
  let newId: string | null = null;
  try {
    if (id) {
      if (p.data.status === "PUBLISHED") {
        const words = await db.word.count({ where: { levelId: id } });
        const { min, max } = WORD_LIMITS[p.data.type];
        if (words < min || words > max) return fail(`هذا الشكل يحتاج من ${min} إلى ${max} أسئلة (المستوى فيه ${words}).`);
      }
      await db.level.update({ where: { id }, data: p.data });
    } else {
      newId = (await db.level.create({ data: { ...p.data, status: "DRAFT" } })).id;
    }
  } catch (e) {
    return dbError(e);
  }
  contentChanged();
  if (newId) redirect(`/admin/levels/${newId}`);
  return done("تم الحفظ");
}

export async function deleteLevel(id: string, stageId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await db.level.delete({ where: { id } });
  } catch (e) {
    return dbError(e);
  }
  contentChanged();
  redirect(`/admin/content?stage=${stageId}`);
}

// ───────────── Students ─────────────

export async function deleteStudent(id: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await db.student.delete({ where: { id } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/students");
}

// ───────────── Words ─────────────

export async function saveWord(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = parse(wordSchema, form);
  if ("error" in p) return p.error;
  try {
    if (id) await db.word.update({ where: { id }, data: p.data });
    else await db.word.create({ data: p.data });
  } catch (e) {
    return dbError(e);
  }
  contentChanged();
  return done(id ? "تم الحفظ" : "تمت إضافة الكلمة");
}

export async function deleteWord(id: string): Promise<ActionState> {
  await requireAdmin();
  try {
    const word = await db.word.delete({ where: { id }, select: { levelId: true } });
    // A published level must never end up empty.
    if ((await db.word.count({ where: { levelId: word.levelId } })) === 0) {
      await db.level.update({ where: { id: word.levelId }, data: { status: "DRAFT" } });
    }
  } catch (e) {
    return dbError(e);
  }
  contentChanged();
  return done("تم الحذف");
}
