"use client";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { importAction, type ImportState } from "../../actions";

/** Two steps on one form: «فحص» validates the whole sheet, «استيراد» (enabled after a clean check) writes it. */
export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, {} as ImportState);
  const [fileName, setFileName] = useState<string | null>(null);
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const clean = state.checked && !state.error && !state.summary;
  const canApply = clean && checkedFor === fileName;
  const newLevels = state.levels?.filter((l) => !l.exists).length ?? 0;

  return (
    <form
      ref={formRef}
      // Submitted manually (not via `action=`) so React does not clear the chosen file between «فحص» and «استيراد».
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        setCheckedFor(fileName);
        startTransition(() => action(fd));
      }}
      style={{ display: "grid", gap: 12 }}
    >
      <label className="upload-box">
        <input
          type="file"
          name="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <span>
          <b>📄 {fileName ?? "اختر ملف Excel"}</b>
          <small>‎.xlsx‎ أو ‎.csv‎ — حتى 5 ميجابايت</small>
        </span>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
        <input type="checkbox" name="publish" defaultChecked /> نشر المستويات للطلاب مباشرة بعد الاستيراد
      </label>
      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button className="abtn abtn-light" name="intent" value="check" disabled={pending || !fileName}>
          {pending ? "..." : "🔍 فحص الملف"}
        </button>
        <button className="abtn" name="intent" value="apply" disabled={pending || !canApply}>
          ✅ استيراد
        </button>
      </div>

      {state.error && (
        <p className="msg msg-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="msg msg-ok" role="status">
          {state.ok}
          {clean && state.levels && ` ${state.rowCount} سؤال في ${state.levels.length} مستوى (${newLevels} جديد، ${state.levels.length - newLevels} تحديث).`}
        </p>
      )}

      {state.summary && (
        <div className="import-summary">
          <span>🆕 مستويات جديدة: {state.summary.levelsCreated}</span>
          <span>♻️ مستويات محدّثة: {state.summary.levelsUpdated}</span>
          <span>➕ أسئلة جديدة: {state.summary.questionsCreated}</span>
          <span>✏️ أسئلة محدّثة: {state.summary.questionsUpdated}</span>
          {state.summary.questionsRemoved > 0 && <span>🗑️ أسئلة حُذفت: {state.summary.questionsRemoved}</span>}
          <Link href="/admin/curriculum" className="abtn abtn-light abtn-sm">
            عرض المنهج ←
          </Link>
        </div>
      )}

      {!!state.errors?.length && (
        <div className="issues">
          <b>الأخطاء ({state.errors.length}) — لن يُحفظ شيء حتى تُصحَّح:</b>
          <ul>
            {state.errors.slice(0, 200).map((e, i) => (
              <li key={i}>
                {e.row ? <span className="issue-row">صف {e.row}</span> : null} {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!state.warnings?.length && (
        <div className="issues issues-warn">
          <b>تنبيهات ({state.warnings.length}):</b>
          <ul>
            {state.warnings.map((e, i) => (
              <li key={i}>
                {e.row ? <span className="issue-row">صف {e.row}</span> : null} {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!state.levels?.length && !state.summary && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>المرحلة</th>
                <th>المستوى</th>
                <th>العنوان</th>
                <th>الشكل</th>
                <th>الأسئلة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.levels.map((l) => (
                <tr key={`${l.stage}:${l.order}`}>
                  <td className="num">{l.stage}</td>
                  <td className="num">{l.order}</td>
                  <td>{l.title}</td>
                  <td>{l.type}</td>
                  <td className="num">{l.questions}</td>
                  <td>{l.exists ? <span className="badge badge-MEDIUM">تحديث</span> : <span className="badge badge-PUBLISHED">جديد</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
