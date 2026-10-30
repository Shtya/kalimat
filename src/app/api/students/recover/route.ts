import { cookies } from "next/headers";
import { parseContact } from "@/lib/contact";
import { guard, json } from "@/lib/http";
import { recoverStudentSchema } from "@/lib/validation";
import { findStudentByEmail, findStudentByPhone, STUDENT_COOKIE, studentCookieOptions } from "@/server/services/student";

/** Opens the saved account from a phone number or email the student stored in settings. */
export async function POST(req: Request) {
  const { data, error } = await guard(req, { name: "student-recover", limit: 8, windowMs: 15 * 60_000, schema: recoverStudentSchema });
  if (error) return error;

  const parsed = parseContact(data.contact);
  if ("error" in parsed) return json({ error: "invalid", issues: [parsed.error] }, 400);

  const student = parsed.email ? await findStudentByEmail(parsed.email) : parsed.phone ? await findStudentByPhone(parsed.phone) : null;
  if (!student) return json({ error: "not_found", issues: ["ما لقيناش حساب بهذا الرقم أو البريد"] }, 404);

  (await cookies()).set(STUDENT_COOKIE, student.anonymousId, studentCookieOptions);
  return json({ anonymousId: student.anonymousId, name: student.name });
}
