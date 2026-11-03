import { buildDemo } from "@/server/import/excel";
import { getAdmin } from "@/server/services/auth";

/** A filled, valid example sheet (stage 1 sample levels) to try the import or copy rows from. */
export async function GET() {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const body = await buildDemo();
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="kalimat-quraniya-demo.xlsx"; filename*=UTF-8''${encodeURIComponent("بيانات تجريبية - كلمات قرآنية.xlsx")}`,
      "cache-control": "no-store",
    },
  });
}
