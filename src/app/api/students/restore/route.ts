import { cookies } from "next/headers";
import { guard, json } from "@/lib/http";
import { restoreStudentSchema } from "@/lib/validation";
import { findStudentByAnonymousId, STUDENT_COOKIE, studentCookieOptions } from "@/server/services/student";

/** Re-issues the cookie from the id kept in the device's localStorage. */
export async function POST(req: Request) {
  const { data, error } = await guard(req, { name: "student-restore", limit: 20, windowMs: 10 * 60_000, schema: restoreStudentSchema });
  if (error) return error;
  const student = await findStudentByAnonymousId(data.anonymousId);
  if (!student) return json({ error: "not_found" }, 404);
  (await cookies()).set(STUDENT_COOKIE, student.anonymousId, studentCookieOptions);
  return json({ ok: true, name: student.name });
}
