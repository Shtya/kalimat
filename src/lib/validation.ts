import { z } from "zod";
import { isValidGameWord, normalizeWord } from "./arabic";
import { GAME_TYPES } from "./games/types";
import { AUDIENCES, KINDS, TRACKS } from "./quran/labels";

const id = z.string().min(1).max(40);

/** First name only: letters, 2–20 chars, no spaces/digits so kids can't type full names or phone numbers. */
export const firstName = z
  .string()
  .trim()
  .min(2, "الاسم قصير جدًا")
  .max(20, "الاسم طويل جدًا")
  .regex(/^[ء-يa-zA-Z]+$/, "اكتب اسمك الأول فقط بالحروف");

export const createStudentSchema = z.object({ name: firstName, track: z.enum(TRACKS, { message: "اختر مسارك" }) });
export const restoreStudentSchema = z.object({ anonymousId: z.string().uuid() });
export const recoverStudentSchema = z.object({
  contact: z.string().trim().min(3, "اكتب رقمك أو بريدك").max(120),
});
export const updateContactSchema = z.object({
  phone: z.string().max(24).default(""),
  email: z.string().max(120).default(""),
});

export const submitProgressSchema = z.object({
  levelId: id,
  /** Client-generated id so offline retries are idempotent. */
  clientAttemptId: z.string().uuid(),
  timeSpent: z.number().int().min(1).max(3600),
  hintsUsed: z.number().int().min(0).max(50),
  mistakes: z.number().int().min(0).max(500),
  wordsSolved: z.number().int().min(1).max(50),
  /** When the level was finished (ms since epoch); results saved offline are sent later. */
  playedAt: z.number().int().positive().optional(),
  /** Per-question outcome (optional so attempts queued by older app versions still sync). */
  items: z
    .array(z.object({ wordId: id, mistakes: z.number().int().min(0).max(100), hints: z.number().int().min(0).max(10) }))
    .max(50)
    .optional(),
});
export type SubmitProgressInput = z.infer<typeof submitProgressSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد غير صالح").max(120),
  password: z.string().min(1, "أدخل كلمة المرور").max(200),
});

const status = z.enum(["DRAFT", "PUBLISHED"]);
const order = z.coerce.number().int().min(0).max(10_000);

const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().int().min(min).max(max).nullable());

export const stationSchema = z.object({
  title: z.string().trim().min(2).max(120),
  goal: z.string().trim().min(3).max(400),
  icon: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح"),
  status,
});

export const stageSchema = z.object({
  title: z.string().trim().min(2).max(120),
  valueCluster: z.string().trim().min(3).max(600),
  status,
});

export const levelSchema = z.object({
  stageId: id,
  surahNumber: optionalInt(1, 114),
  title: z.string().trim().min(2).max(80),
  order: z.coerce.number().int().min(1).max(500),
  type: z.enum(GAME_TYPES),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  audience: z.enum(AUDIENCES),
  status,
});

export const wordSchema = z.object({
  levelId: id,
  text: z
    .string()
    .transform(normalizeWord)
    .refine(isValidGameWord, "الكلمة يجب أن تكون عربية بدون مسافات (٢–٩ حروف)"),
  hint: z.string().trim().min(3).max(140),
  fact: z.string().trim().min(3).max(280),
  kind: z.enum(KINDS),
  surahNumber: optionalInt(1, 114),
  ayah: optionalInt(1, 286),
  quranText: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(500).nullable()),
  order,
});
