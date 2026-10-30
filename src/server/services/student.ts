import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Track } from "@/lib/quran/labels";

export const STUDENT_COOKIE = "kid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export const studentCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ONE_YEAR,
};

/** The student for the current request (from the anonymous-id cookie), memoized per request. */
export const getCurrentStudent = cache(async () => {
  const anonymousId = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!anonymousId) return null;
  return db.student.findUnique({
    where: { anonymousId },
    select: {
      id: true,
      name: true,
      track: true,
      anonymousId: true,
      phone: true,
      email: true,
    },
  });
});

export function registerStudent(name: string, track: Track) {
  return db.student.create({
    data: { name, track, anonymousId: randomUUID() },
    select: { id: true, name: true, anonymousId: true, track: true },
  });
}

const sessionSelect = { id: true, name: true, anonymousId: true, track: true } as const;

export function findStudentByAnonymousId(anonymousId: string) {
  return db.student.findUnique({ where: { anonymousId }, select: sessionSelect });
}

export function findStudentByPhone(phone: string) {
  return db.student.findUnique({ where: { phone }, select: sessionSelect });
}

export function findStudentByEmail(email: string) {
  return db.student.findUnique({ where: { email }, select: sessionSelect });
}

export async function updateStudentContact(studentId: string, phone: string | null, email: string | null) {
  try {
    return await db.student.update({
      where: { id: studentId },
      data: { phone, email },
      select: { phone: true, email: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "taken" as const;
    throw e;
  }
}
