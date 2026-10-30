import { KIND_LABEL } from "@/lib/quran/labels";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "رفع الأسئلة من Excel" };

export default function ImportPage() {
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>رفع الأسئلة من Excel</h1>
          <p>جهّز الأسئلة في ملف Excel بنفس شكل القالب، ثم ارفعه هنا. يُفحص الملف كاملًا قبل حفظ أي شيء.</p>
        </div>
        <div className="actions">
          <a href="/admin/files/template" className="abtn">
            ⬇️ تنزيل القالب
          </a>
          <a href="/admin/files/export" className="abtn abtn-light">
            ⬇️ تنزيل كل الأسئلة الحالية
          </a>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>1. ارفع الملف</h2>
          <ImportForm />
        </section>

        <section className="panel">
          <h2>طريقة تجهيز الملف</h2>
          <ol className="howto">
            <li>
              نزّل <b>القالب</b>: فيه ورقة «الأسئلة» وورقة «تعليمات» وورقة «المراحل والسور».
            </li>
            <li>
              <b>كل صف = سؤال</b>. الصفوف التي لها نفس «رقم المرحلة» و«رقم المستوى» تكوّن مستوى لعب واحدًا.
            </li>
            <li>
              اكتب <b>عنوان المستوى وشكل اللعبة</b> في أول صف للمستوى فقط.
            </li>
            <li>
              <b>السورة</b> بالاسم أو الرقم، ولازم تكون من سور المرحلة.
            </li>
            <li>
              <b>الكلمة</b> كلمة واحدة بالرسم الإملائي (الصلاة، الرحمن). لعرض الرسم العثماني استخدم عمود «النص القرآني».
            </li>
            <li>
              لو رفعت مستوى <b>موجود بنفس الرقم</b> يتحدّث وأسئلته تُستبدل، والمستويات غير الموجودة في الملف لا تتغير.
            </li>
          </ol>
          <h2 style={{ marginTop: 16 }}>أنواع المعرفة (للقياس)</h2>
          <ul className="howto">
            {Object.values(KIND_LABEL).map((k) => (
              <li key={k.name}>
                {k.icon} <b>{k.name}</b>: {k.help}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
