"use client";
import { useRef, useState } from "react";
import { boardOf, type Cell } from "@/lib/games/types";
import { buzz, sfx } from "@/lib/sound";
import type { ModeProps } from "../GameShell";

const FOUND_COLORS = ["#5b9ae8", "#4fbf7f", "#e07aa3", "#d9a52b", "#9c74cf", "#2fb5ac", "#e8854a", "#7f8fb0"];
const key = ([r, c]: Cell) => `${r}:${c}`;

/** Straight line of cells from a to b (row, column or diagonal), or null if not aligned. */
function lineBetween(a: Cell, b: Cell): Cell[] | null {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  if (!(a[0] === b[0] || a[1] === b[1] || Math.abs(b[0] - a[0]) === Math.abs(b[1] - a[1]))) return null;
  return Array.from({ length: len + 1 }, (_, k) => [a[0] + dr * k, a[1] + dc * k] as Cell);
}

/** شبكة الحروف — find every word of the level hidden in a square of letters. */
export default function SearchMode({ data, api }: ModeProps) {
  const { grid, placements } = boardOf(data, "WORD_SEARCH");
  const size = grid.length;
  const gridRef = useRef<HTMLDivElement>(null);
  const start = useRef<Cell | null>(null);
  const [path, setPath] = useState<Cell[]>([]);
  const [wrong, setWrong] = useState(false);
  const [hintCell, setHintCell] = useState<string | null>(null);

  // cell -> colour of the word that was found through it
  const foundColor = new Map<string, string>();
  placements.forEach((p) => {
    if (api.found[p.wordIndex]) p.cells.forEach((c) => foundColor.set(key(c), FOUND_COLORS[p.wordIndex % FOUND_COLORS.length]));
  });
  const selected = new Set(path.map(key));

  function cellAt(x: number, y: number): Cell | null {
    const rect = gridRef.current!.getBoundingClientRect();
    // The grid is right-to-left: column 0 is on the right edge.
    const col = Math.floor(((rect.right - x) / rect.width) * size);
    const row = Math.floor(((y - rect.top) / rect.height) * size);
    return row >= 0 && col >= 0 && row < size && col < size ? [row, col] : null;
  }

  function onDown(e: React.PointerEvent) {
    if (api.paused) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = cell;
    setPath([cell]);
    sfx.tap(0);
  }

  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    const line = lineBetween(start.current, cell);
    if (line && line.length !== path.length) {
      setPath(line);
      sfx.tap(line.length);
      buzz(6);
    }
  }

  function onUp() {
    if (!start.current) return;
    start.current = null;
    const chosen = path.map(key);
    setPath([]);
    if (chosen.length < 2) return;
    // Accept a word dragged in either direction, but only the exact hidden placement.
    const hit = placements.find((p) => {
      if (api.found[p.wordIndex] || p.cells.length !== chosen.length) return false;
      const cells = p.cells.map(key);
      return cells.every((c, i) => c === chosen[i]) || cells.every((c, i) => c === chosen[chosen.length - 1 - i]);
    });
    if (hit) {
      setHintCell(null);
      api.solve(hit.wordIndex);
    } else {
      api.mistake();
      setWrong(true);
      setTimeout(() => setWrong(false), 450);
    }
  }

  api.hintRef.current = () => {
    const target = placements.find((p) => !api.found[p.wordIndex]);
    if (!target) return false;
    setHintCell(key(target.cells[0]));
    return target.wordIndex;
  };

  return (
    <>
      <div className="question">
        <small>
          {data.meta.context}
        </small>
        <p>ابحث عن الكلمات في الشبكة واسحب إصبعك فوقها</p>
      </div>

      <div
        ref={gridRef}
        className={`search-grid${wrong ? " is-wrong" : ""}`}
        style={{ "--n": size } as React.CSSProperties}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="grid"
        aria-label="شبكة الحروف"
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const k = `${r}:${c}`;
            const color = foundColor.get(k);
            return (
              <span
                key={k}
                className={`search-cell${selected.has(k) ? " is-selected" : ""}${color ? " is-found" : ""}${hintCell === k ? " is-hint-cell" : ""}`}
                style={color ? ({ "--found": color } as React.CSSProperties) : undefined}
              >
                {letter}
              </span>
            );
          }),
        )}
      </div>

      <ul className="word-list" aria-label="الكلمات المطلوبة">
        {data.words.map((w, i) => (
          <li key={w.id} className={api.found[i] ? "is-done" : ""} style={{ "--found": FOUND_COLORS[i % FOUND_COLORS.length] } as React.CSSProperties}>
            <span className="wl-mark" aria-hidden>
              {api.found[i] ? "✓" : w.letters.length}
            </span>
            <span>
              {api.found[i] ? <b>{w.text}</b> : w.hint}
              {!api.found[i] && <small> ({w.letters.length} حروف)</small>}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
