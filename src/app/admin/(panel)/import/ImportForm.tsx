"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Icon } from "@/components/play/Icon";
import type { Issue } from "@/server/import/parse";
import { importAction, type ImportState } from "../../actions";

const RULES = [
  "كل صف = سؤال واحد. الصفوف التي لها نفس «رقم المرحلة» و«رقم المستوى» تكوّن مستوى لعب واحدًا.",
  "اكتب عنوان المستوى وشكل اللعبة في أول صف للمستوى فقط.",
  "السورة بالاسم أو الرقم، ويجب أن تكون من سور المرحلة (انظر ورقة «المراحل والسور» في القالب).",
  "الكلمة كلمة واحدة بالرسم الإملائي (الصلاة، الرحمن)، ولا تتكرر في نفس المستوى.",
  "مستوى موجود بنفس الرقم يتحدّث وأسئلته تُستبدل. المستويات غير الموجودة في الملف لا تتغير.",
];

/**
 * Three steps: get a file (template or demo), check it (nothing is saved, every problem is listed with its
 * row and column), then import — enabled only once the same file passed the check.
 */
export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, {} as ImportState);
  const [fileName, setFileName] = useState<string | null>(null);
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const clean = state.checked && !state.errors?.length && !state.summary && !state.error;
  const sameFile = checkedFor === fileName;
  const canApply = clean && sameFile;
  const newLevels = state.levels?.filter((l) => !l.exists).length ?? 0;
  const step = state.summary ? 4 : canApply ? 3 : fileName ? 2 : 1;
  const firstStage = state.levels?.[0]?.stage;

  return (
    <form
      // Submitted manually (not via `action=`) so React does not clear the chosen file between «فحص» and «استيراد».
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        setCheckedFor(fileName);
        startTransition(() => action(fd));
      }}
      className="import"
    >
      <ol className="stepper" aria-label="خطوات الاستيراد">
        {["جهّز الملف", "افحصه", "استورد"].map((label, i) => (
          <li key={label} className={step > i + 1 ? "is-done" : step === i + 1 ? "is-current" : undefined}>
            <span>{step > i + 1 ? <Icon name="check" size={14} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <section className="import-step">
        <h3>١. ابدأ من ملف جاهز</h3>
        <div className="file-tiles">
          <a href="/admin/files/template" className="file-tile">
            <Icon name="file" size={24} />
            <span>
              <b>القالب الفارغ</b>
              <small>الأعمدة الصحيحة + قوائم اختيار + ورقة تعليمات وورقة المراحل والسور.</small>
            </span>
            <Icon name="download" size={18} />
          </a>
          <a href="/admin/files/demo" className="file-tile">
            <Icon name="sparkle" size={24} />
            <span>
              <b>بيانات تجريبية</b>
              <small>6 مستويات جاهزة للمرحلة 1 بكل أشكال اللعب. ارفعها كما هي لتجربة الاستيراد.</small>
            </span>
            <Icon name="download" size={18} />
          </a>
        </div>
        <details className="rules">
          <summary>قواعد الملف باختصار</summary>
          <ul>
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      </section>

      <section className="import-step">
        <h3>٢. ارفع الملف وافحصه</h3>
        <label className={`upload-box${dragging ? " is-drag" : ""}${fileName ? " has-file" : ""}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDrop={() => setDragging(false)}>
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <span>
            <Icon name={fileName ? "file" : "upload"} size={28} />
            <b>{fileName ? <bdi>{fileName}</bdi> : "اسحب ملف Excel هنا أو اضغط للاختيار"}</b>
            <small>{fileName ? "اضغط لاختيار ملف آخر" : "‎.xlsx‎ أو ‎.csv‎ — حتى 5 ميجابايت و5000 صف"}</small>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" name="publish" defaultChecked />
          <span>
            <b>انشر المستويات للطلاب بعد الاستيراد</b>
            <small>ألغِ الاختيار لتبقى مسودات تراجعها أولًا.</small>
          </span>
        </label>
        <div className="import-actions">
          <button className="abtn abtn-light" name="intent" value="check" disabled={pending || !fileName}>
            <Icon name="search" size={17} /> {pending ? "جارٍ الفحص…" : "فحص الملف"}
          </button>
          <button className="abtn" name="intent" value="apply" disabled={pending || !canApply}>
            <Icon name="check" size={17} /> استيراد
          </button>
        </div>
        {clean && !sameFile ? (
          <p className="msg msg-warn">اخترت ملفًا آخر بعد الفحص — افحصه قبل الاستيراد.</p>
        ) : (
          !canApply && <small className="fld-help">لا يُحفظ شيء عند الفحص. زر «استيراد» يعمل بعد فحص بدون أخطاء.</small>
        )}
      </section>

      {state.error && !state.errors?.length && (
        <p className="msg msg-error" role="alert">
          {state.error}
        </p>
      )}

      {state.checked && (
        <section className="import-step report" aria-live="polite">
          <h3>{state.summary ? "تم الاستيراد" : "٣. نتيجة الفحص"}</h3>
          <div className="report-chips">
            <span>
              <b>{state.rowCount ?? 0}</b> سؤال
            </span>
            <span>
              <b>{state.levels?.length ?? 0}</b> مستوى
            </span>
            {!!state.levels?.length && (
              <span>
                <b>{newLevels}</b> جديد · <b>{state.levels.length - newLevels}</b> تحديث
              </span>
            )}
            <span className={state.errors?.length ? "is-bad" : "is-good"}>
              <b>{state.errors?.length ?? 0}</b> خطأ
            </span>
            {!!state.warnings?.length && (
              <span className="is-warn">
                <b>{state.warnings.length}</b> تنبيه
              </span>
            )}
          </div>

          {state.summary ? (
            <div className="report-done">
              <Icon name="check" size={22} />
              <p>
                {state.summary.levelsCreated} مستوى جديد و{state.summary.levelsUpdated} مستوى محدّث، {state.summary.questionsCreated} سؤال جديد و{state.summary.questionsUpdated} محدّث
                {state.summary.questionsRemoved > 0 && `، وحُذف ${state.summary.questionsRemoved} سؤال لم يعد في الملف`}.
              </p>
              {firstStage && (
                <Link href={`/admin/content?stage=${firstStage}`} className="abtn abtn-sm">
                  عرض المرحلة {firstStage}
                </Link>
              )}
            </div>
          ) : state.errors?.length ? (
            <p className="msg msg-error" role="alert">
              لم يُحفظ أي شيء. صحّح الأخطاء التالية في الملف ثم ارفعه وافحصه مرة أخرى.
            </p>
          ) : (
            <p className="msg msg-ok" role="status">
              الملف سليم. اضغط «استيراد» للحفظ.
            </p>
          )}

          {!!state.errors?.length && <IssueTable issues={state.errors} kind="error" />}
          {!!state.warnings?.length && <IssueTable issues={state.warnings} kind="warn" />}

          {!!state.levels?.length && !state.summary && (
            <details className="rules" open={!state.errors?.length}>
              <summary>المستويات التي سيتم حفظها ({state.levels.length})</summary>
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
            </details>
          )}
        </section>
      )}
    </form>
  );
}

function IssueTable({ issues, kind }: { issues: Issue[]; kind: "error" | "warn" }) {
  const shown = issues.slice(0, 300);
  return (
    <div className={`issue-table is-${kind}`}>
      <b>{kind === "error" ? `الأخطاء (${issues.length})` : `تنبيهات لا تمنع الحفظ (${issues.length})`}</b>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>الصف</th>
              <th>العمود</th>
              <th>المشكلة</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={i}>
                <td className="num">{e.row ?? "—"}</td>
                <td className="issue-col">{e.column ?? "—"}</td>
                <td>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {issues.length > shown.length && <small className="muted">يظهر أول {shown.length} فقط.</small>}
    </div>
  );
}
