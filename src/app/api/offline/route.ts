import { json } from "@/lib/http";
import { offlineUrls } from "@/server/services/offline";
import { getJourney } from "@/server/services/progress";
import { getCurrentStudent } from "@/server/services/student";

/** The pages the service worker downloads so the current student can keep playing offline. */
export async function GET() {
  const student = await getCurrentStudent();
  if (!student) return json({ error: "no_student" }, 401);
  const journey = await getJourney(student);
  return json({ urls: offlineUrls(journey) });
}
