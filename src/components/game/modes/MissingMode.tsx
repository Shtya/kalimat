"use client";
import { useEffect, useState } from "react";
import { boardOf } from "@/lib/games/types";
import { buzz, sfx } from "@/lib/sound";
import type { ModeProps } from "../GameShell";

/** أكمل الكلمة — the word is shown with missing letters; pick the right letter for each gap. */
export default function MissingMode({ data, api }: ModeProps) {
  const current = api.current; // plain index (not a ref)
  const word = data.words[current];
  const blanks = boardOf(data, "MISSING_LETTER").blanks[api.current];
  const solved = api.found[api.current];

  const [step, setStep] = useState(0); // which blank is being filled
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const [hinted, setHinted] = useState<string | null>(null);

  useEffect(() => {
    setStep(0);
    setHinted(null);
  }, [current]);

  const filled = new Set(blanks.slice(0, step).map((b) => b.index));
  const active = blanks[step];

  function choose(letter: string) {
    if (api.paused || solved || !active) return;
    if (letter === word.letters[active.index]) {
      sfx.tap(step + 3);
      buzz();
      setHinted(null);
      const next = step + 1;
      setStep(next);
      if (next >= blanks.length) api.solve(api.current);
    } else {
      api.mistake(current);
      setWrongOption(letter);
      setTimeout(() => setWrongOption(null), 450);
    }
  }

  api.hintRef.current = () => {
    if (solved || !active || hinted) return false;
    setHinted(word.letters[active.index]);
    return current;
  };

  return (
    <>
      <div className="question">
        <small>
          {data.meta.context}
        </small>
        <p>{word.hint}</p>
      </div>

      <div className={`slots${wrongOption ? " is-wrong" : ""}`} aria-live="polite" style={{ marginTop: 8 }}>
        {word.letters.map((letter, i) => {
          const isBlank = blanks.some((b) => b.index === i);
          const show = solved || !isBlank || filled.has(i);
          const isActive = !solved && active?.index === i;
          return (
            <span
              key={`${api.current}-${i}`}
              className={`slot${solved ? " is-filled" : !isBlank ? " is-given" : filled.has(i) ? " is-hint" : ""}${isActive ? " is-active" : ""}`}
            >
              {show ? letter : "؟"}
            </span>
          );
        })}
      </div>

      <p className="mode-help">اختر الحرف الناقص {blanks.length > 1 && !solved ? `(${Math.min(step + 1, blanks.length)} من ${blanks.length})` : ""}</p>

      <div className="options-grid" role="group" aria-label="الحروف المقترحة">
        {(active?.options ?? blanks[blanks.length - 1].options).map((letter) => (
          <button
            key={`${api.current}-${step}-${letter}`}
            type="button"
            className={`tile option-tile${wrongOption === letter ? " is-wrong-tile" : ""}${hinted === letter ? " is-hint-tile is-hot" : ""}`}
            onClick={() => choose(letter)}
            disabled={api.paused || solved}
          >
            {letter}
          </button>
        ))}
      </div>
    </>
  );
}
