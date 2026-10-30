import { guard, json } from "@/lib/http";
import { submitProgressSchema } from "@/lib/validation";
import { submitAttempt } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

export async function POST(req: Request) {
  const { data, error } = await guard(req, { name: "progress", limit: 40, windowMs: 60_000, schema: submitProgressSchema });
  if (error) return error;
  const student = await getCurrentStudent();
  if (!student) return json({ error: "no_student" }, 401);
  const result = await submitAttempt(student, data);
  if (!result.ok) return json({ error: result.error }, result.error === "not_found" ? 404 : 422);
  return json(result);
}
