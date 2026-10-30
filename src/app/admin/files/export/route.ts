import { buildExport } from "@/server/import/excel";
import { getAdmin } from "@/server/services/auth";

/** Current questions in the import format (all stages, or ?stage=N) — edit and upload again. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const stage = Number(new URL(req.url).searchParams.get("stage"));
  const stageNumber = Number.isInteger(stage) && stage >= 1 && stage <= 24 ? stage : undefined;
  const body = await buildExport(stageNumber);
  const name = stageNumber ? `أسئلة المرحلة ${stageNumber}.xlsx` : "كل الأسئلة.xlsx";
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="kalimat-quraniya-export.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "no-store",
    },
  });
}
