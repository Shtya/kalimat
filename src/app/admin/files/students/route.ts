import ExcelJS from "exceljs";
import { TRACK_LABEL, TRACKS, type Track } from "@/lib/quran/labels";
import { getAdmin } from "@/server/services/auth";
import { exportStudents, STUDENT_SORTS, STUDENT_STATUSES, type StudentSort, type StudentStatus } from "@/server/services/reports";

/** The students list (same filters as the page) as an Excel sheet. First names and progress only, no contact details. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const track = TRACKS.includes(sp.get("track") as Track) ? (sp.get("track") as Track) : undefined;
  const status = STUDENT_STATUSES.includes(sp.get("status") as StudentStatus) ? (sp.get("status") as StudentStatus) : undefined;
  const sort = STUDENT_SORTS.includes(sp.get("sort") as StudentSort) ? (sp.get("sort") as StudentSort) : undefined;
  const rows = await exportStudents({ q: sp.get("q")?.trim().slice(0, 40) || undefined, track, status, sort });

  const wb = new ExcelJS.Workbook();
  wb.creator = "كلمات قرآنية";
  const ws = wb.addWorksheet("الطلاب", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "الاسم", key: "name", width: 20 },
    { header: "المسار", key: "track", width: 16 },
    { header: "مستويات مكتملة", key: "completed", width: 16 },
    { header: "النجوم", key: "stars", width: 10 },
    { header: "النقاط", key: "score", width: 10 },
    { header: "الإتقان %", key: "mastery", width: 12 },
    { header: "تاريخ الانضمام", key: "createdAt", width: 18 },
    { header: "آخر نشاط", key: "lastActiveAt", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow({ ...r, track: TRACK_LABEL[r.track].name, mastery: r.mastery ?? "" });
  for (const key of ["createdAt", "lastActiveAt"]) ws.getColumn(key).numFmt = "yyyy-mm-dd hh:mm";

  const body = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="kalimat-quraniya-students.xlsx"; filename*=UTF-8''${encodeURIComponent("طلاب كلمات قرآنية.xlsx")}`,
      "cache-control": "no-store",
    },
  });
}
