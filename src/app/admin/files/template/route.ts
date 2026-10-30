import { buildTemplate } from "@/server/import/excel";
import { getAdmin } from "@/server/services/auth";

/** The empty Excel template (with guide, allowed values and the stage/surah list). */
export async function GET() {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const body = await buildTemplate();
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="kalimat-quraniya-template.xlsx"; filename*=UTF-8''${encodeURIComponent("قالب أسئلة كلمات قرآنية.xlsx")}`,
      "cache-control": "no-store",
    },
  });
}
