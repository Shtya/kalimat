"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { boardOf } from "@/lib/games/types";
import type { ModeProps } from "../GameShell";
import { LetterWheel } from "../LetterWheel";

/** عجلة الحروف — build the current word from letters arranged on a circle. */
export default function WheelMode({ data, api }: ModeProps) {
  const current = api.current; // plain index (not a ref)
  const word = data.words[current];
  const wheel = boardOf(data, "WORD_BUILD").wheels[api.current];
  const solved = api.found[api.current];

  const [revealed, setRevealed] = useState<number[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  useEffect(() => setRevealed([]), [current]);

  api.hintRef.current = () => {
    const next = word.letters.findIndex((_, i) => !revealed.includes(i));
    if (solved || next < 0) return false;
    setRevealed([...revealed, next]);
    return current;
  };

  const hintTile = useMemo(() => (revealed.length && !solved ? wheel.indexOf(word.letters[revealed[revealed.length - 1]]) : null), [revealed, solved, wheel, word]);

  const onSubmit = useCallback(
    (indices: number[]) => {
      if (api.paused || solved) return;
      if (indices.map((i) => wheel[i]).join("") === word.letters.join("")) {
        api.solve(api.current);
      } else {
        api.mistake(current);
        setWrong(true);
        setTimeout(() => setWrong(false), 450);
      }
    },
    [api, current, solved, wheel, word],
  );

  return (
    <>
      <div className="question">
        <small>
          {data.meta.context}
        </small>
        <p>{word.hint}</p>
      </div>

      <div className={`slots${wrong ? " is-wrong" : ""}`} aria-live="polite">
        {word.letters.map((letter, i) => (
          <span
            key={`${api.current}-${i}`}
            className={`slot${solved ? " is-filled" : revealed.includes(i) ? " is-hint" : ""}`}
            style={solved ? { animationDelay: `${i * 60}ms` } : undefined}
          >
            {solved || revealed.includes(i) ? letter : ""}
          </span>
        ))}
      </div>

      <div className="preview-word" aria-live="polite">
        {selection.length > 0 && <span>{selection.map((i) => wheel[i]).join("")}</span>}
      </div>

      <div className="wheel-wrap">
        <LetterWheel
          key={api.current}
          letters={wheel}
          targetLength={word.letters.length}
          hintTile={hintTile}
          disabled={api.paused || solved}
          onSubmit={onSubmit}
          onChange={setSelection}
        />
      </div>
    </>
  );
}
