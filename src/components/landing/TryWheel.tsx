"use client";
import { useCallback, useState } from "react";
import { LetterWheel } from "@/components/game/LetterWheel";
import { sfx } from "@/lib/sound";

const ANSWER = ["ا", "ل", "ص", "م", "د"];
const WHEEL = ["م", "ل", "د", "ا", "ص"]; // shuffled, never pre-solved

/** The hero's live demo: the real letter wheel from the app, playing one word (الصمد). */
export function TryWheel() {
  const [selection, setSelection] = useState<number[]>([]);
  const [state, setState] = useState<"play" | "wrong" | "solved">("play");
  const [round, setRound] = useState(0);

  const onSubmit = useCallback((indices: number[]) => {
    if (indices.map((i) => WHEEL[i]).join("") === ANSWER.join("")) {
      sfx.correct();
      setState("solved");
    } else {
      sfx.wrong();
      setState("wrong");
      setTimeout(() => setState("play"), 500);
    }
  }, []);

  return (
    <div className="kid kid-preview try">
      <div className="question">
        <small>سورة الإخلاص · جرّبها الآن</small>
        <p>الذي تقصده المخلوقات في كل حاجاتها</p>
      </div>
      <div className={`slots${state === "wrong" ? " is-wrong" : ""}`} aria-live="polite">
        {ANSWER.map((l, i) => (
          <span key={`${round}-${i}`} className={`slot${state === "solved" ? " is-filled" : ""}`} style={state === "solved" ? { animationDelay: `${i * 60}ms` } : undefined}>
            {state === "solved" ? l : ""}
          </span>
        ))}
      </div>
      <div className="preview-word">{selection.length > 0 && <span>{selection.map((i) => WHEEL[i]).join("")}</span>}</div>
      {state === "solved" ? (
        <div className="try-done">
          <b>أحسنت! «الله الصمد»</b>
          <p>من سورة الإخلاص، وهي تعدل ثلث القرآن. هكذا يتعلم الطالب معلومة بعد كل كلمة.</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setState("play");
              setRound((r) => r + 1);
            }}
          >
            العب مرة أخرى
          </button>
        </div>
      ) : (
        <div className="wheel-wrap">
          <LetterWheel key={round} letters={WHEEL} targetLength={ANSWER.length} hintTile={null} disabled={false} onSubmit={onSubmit} onChange={setSelection} />
        </div>
      )}
      <p className="try-help">اسحب إصبعك على الحروف بالترتيب، أو اضغطها واحدًا بعد الآخر.</p>
    </div>
  );
}
