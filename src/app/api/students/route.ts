import { cookies } from "next/headers";
import { guard, json } from "@/lib/http";
import { createStudentSchema } from "@/lib/validation";
import { registerStudent, STUDENT_COOKIE, studentCookieOptions } from "@/server/services/student";

export async function POST(req: Request) {
  const { data, error } = await guard(req, { name: "student-create", limit: 10, windowMs: 10 * 60_000, schema: createStudentSchema });
  if (error) return error;
  const student = await registerStudent(data.name, data.track);
  (await cookies()).set(STUDENT_COOKIE, student.anonymousId, studentCookieOptions);
  return json({ anonymousId: student.anonymousId, name: student.name }, 201);
}
