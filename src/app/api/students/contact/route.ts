import { parseAccountFields } from "@/lib/contact";
import { guard, json } from "@/lib/http";
import { updateContactSchema } from "@/lib/validation";
import { getCurrentStudent, updateStudentContact } from "@/server/services/student";

/** Attaches a phone and/or email to the student who is playing on this device. */
export async function PATCH(req: Request) {
  const { data, error } = await guard(req, { name: "student-contact", limit: 10, windowMs: 10 * 60_000, schema: updateContactSchema });
  if (error) return error;

  const parsed = parseAccountFields(data.phone ?? "", data.email ?? "");
  if ("error" in parsed) return json({ error: "invalid", issues: [parsed.error] }, 400);

  const student = await getCurrentStudent();
  if (!student) return json({ error: "unauthorized", issues: ["ادخل للعبة أولًا"] }, 401);

  const saved = await updateStudentContact(student.id, parsed.phone, parsed.email);
  if (saved === "taken") return json({ error: "taken", issues: ["هذا الرقم أو البريد مرتبط بحساب آخر"] }, 409);
  return json({ ok: true, phone: saved.phone, email: saved.email });
}
