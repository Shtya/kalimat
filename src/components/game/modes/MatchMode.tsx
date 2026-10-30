"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { boardOf } from "@/lib/games/types";
import { buzz, sfx } from "@/lib/sound";
import type { ModeProps } from "../GameShell";

const PAIR_COLORS = ["#1f63c6", "#2e9e5b", "#d6457e", "#b98108", "#7b4bb7", "#0f9a91"];
type Line = { x1: number; y1: number; x2: number; y2: number; color: string };

/** توصيل — connect each word (right column) to its meaning (left column). */
export default function MatchMode({ data, api }: ModeProps) {
  const { wordOrder, hintOrder } = boardOf(data, "MATCH");
  const boxRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hintRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [picked, setPicked] = useState<{ side: "word" | "hint"; index: number } | null>(null);
  const [wrong, setWrong] = useState<number | null>(null); // word index that flashed red
  const [hinted, setHinted] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const matchOrder = useRef<number[]>([]);

  // Draw a line between every matched pair (re-measured on resize).
  useLayoutEffect(() => {
    function measure() {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;
      setLines(
        data.words.flatMap((_, i) => {
          if (!api.found[i]) return [];
          const a = wordRefs.current[i]?.getBoundingClientRect();
          const b = hintRefs.current[i]?.getBoundingClientRect();
          if (!a || !b) return [];
          const color = PAIR_COLORS[matchOrder.current.indexOf(i) % PAIR_COLORS.length];
          return [{ x1: a.left - box.left, y1: a.top + a.height / 2 - box.top, x2: b.right - box.left, y2: b.top + b.height / 2 - box.top, color }];
        }),
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [api.found, data.words]);

  function tryPair(wordIndex: number, hintIndex: number) {
    setPicked(null);
    if (wordIndex === hintIndex) {
      matchOrder.current.push(wordIndex);
      setHinted(null);
      api.solve(wordIndex);
    } else {
      api.mistake(wordIndex);
      setWrong(wordIndex);
      setTimeout(() => setWrong(null), 450);
    }
  }

  function pick(side: "word" | "hint", index: number) {
    if (api.paused || api.found[index]) return;
    sfx.tap(side === "word" ? 2 : 5);
    buzz();
    if (!picked || picked.side === side) return setPicked({ side, index });
    if (side === "word") tryPair(index, picked.index);
    else tryPair(picked.index, index);
  }

  api.hintRef.current = () => {
    const target = picked?.side === "word" ? picked.index : wordOrder.find((i) => !api.found[i]);
    if (target === undefined || hinted === target) return false;
    setPicked({ side: "word", index: target });
    setHinted(target);
    return target;
  };

  const colorOf = (i: number) => PAIR_COLORS[matchOrder.current.indexOf(i) % PAIR_COLORS.length];

  return (
    <>
      <div className="question">
        <small>
          {data.meta.context}
        </small>
        <p>صِل كل كلمة بمعناها</p>
      </div>

      <div className="match-board" ref={boxRef}>
        <svg className="match-lines" aria-hidden>
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="4" strokeLinecap="round" />
          ))}
        </svg>
        <div className="match-col" role="group" aria-label="الكلمات">
          {wordOrder.map((i) => (
            <button
              key={data.words[i].id}
              ref={(el) => {
                wordRefs.current[i] = el;
              }}
              type="button"
              className={`match-word${picked?.side === "word" && picked.index === i ? " is-picked" : ""}${api.found[i] ? " is-matched" : ""}${wrong === i ? " is-wrong-tile" : ""}`}
              style={api.found[i] ? ({ "--pair": colorOf(i) } as React.CSSProperties) : undefined}
              onClick={() => pick("word", i)}
              disabled={api.found[i]}
            >
              {data.words[i].text}
            </button>
          ))}
        </div>
        <div className="match-col match-col-hints" role="group" aria-label="المعاني">
          {hintOrder.map((i) => (
            <button
              key={data.words[i].id}
              ref={(el) => {
                hintRefs.current[i] = el;
              }}
              type="button"
              className={`match-hint${picked?.side === "hint" && picked.index === i ? " is-picked" : ""}${api.found[i] ? " is-matched" : ""}${hinted === i ? " is-hinted" : ""}`}
              style={api.found[i] ? ({ "--pair": colorOf(i) } as React.CSSProperties) : undefined}
              onClick={() => pick("hint", i)}
              disabled={api.found[i]}
            >
              {data.words[i].hint}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
