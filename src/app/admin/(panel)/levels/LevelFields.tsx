import { SubmitButton } from "@/components/admin/ActionForm";
import { Dropdown } from "@/components/admin/Dropdown";
import { GAME_TYPE_LABEL } from "@/lib/format";
import { GAME_TYPES } from "@/lib/games/types";
import { WORD_LIMITS } from "@/lib/scoring";

type Level = { title: string; order: number; difficulty: string; status: string; type: string; audience: string; surahNumber: number | null };

/** Shared level fields. Status is only editable on an existing level (new ones start as drafts). */
export function LevelFields({ l, order = 1, surahs }: { l?: Level; order?: number; surahs: { number: number; name: string }[] }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <fieldset className="type-picker">
        <legend className="fld">شكل اللعبة</legend>
        {GAME_TYPES.map((type) => {
          const t = GAME_TYPE_LABEL[type];
          const limits = WORD_LIMITS[type];
          return (
            <label key={type} className="type-card">
              <input type="radio" name="type" value={type} defaultChecked={(l?.type ?? "WORD_BUILD") === type} />
              <span>
                <span className="type-icon" aria-hidden>
                  {t.icon}
                </span>
                <b>{t.name}</b>
                <small>{t.help}</small>
                <small className="type-limit">
                  {limits.min}–{limits.max} أسئلة
                </small>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="form-row">
        <label className="fld">
          العنوان
          <input name="title" defaultValue={l?.title} required minLength={2} maxLength={80} />
        </label>
        <label className="fld">
          الترتيب
          <input name="order" type="number" min={0} defaultValue={l?.order ?? order} required />
        </label>
        <div className="fld">
          السورة
          <Dropdown
            name="surahNumber"
            defaultValue={l?.surahNumber ? String(l.surahNumber) : ""}
            options={[{ value: "", label: "عدة سور" }, ...surahs.map((s) => ({ value: String(s.number), label: s.name }))]}
          />
        </div>
        <div className="fld">
          المسار
          <Dropdown
            name="audience"
            defaultValue={l?.audience ?? "ALL"}
            options={[
              { value: "ALL", label: "الكل" },
              { value: "CHILD", label: "الطفولة فقط" },
              { value: "YOUTH", label: "النشء فقط" },
            ]}
          />
        </div>
        <div className="fld">
          الصعوبة
          <Dropdown
            name="difficulty"
            defaultValue={l?.difficulty ?? "EASY"}
            options={[
              { value: "EASY", label: "سهل" },
              { value: "MEDIUM", label: "متوسط" },
              { value: "HARD", label: "صعب" },
            ]}
          />
        </div>
        {l && (
          <div className="fld">
            الحالة
            <Dropdown
              name="status"
              defaultValue={l.status}
              options={[
                { value: "DRAFT", label: "مسودة" },
                { value: "PUBLISHED", label: "منشور" },
              ]}
            />
          </div>
        )}
        <SubmitButton>{l ? "حفظ" : "إنشاء"}</SubmitButton>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
        الصعوبة تغيّر اللعبة: حروف زائدة في العجلة، اتجاهات أكثر في الشبكة (أفقي ← رأسي ← قطري)، وحروف ناقصة أكثر في «أكمل الكلمة».
      </p>
    </div>
  );
}
