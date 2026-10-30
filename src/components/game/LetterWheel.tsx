"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/play/Icon";
import { buzz, sfx } from "@/lib/sound";

type Props = {
  letters: string[];
  /** Number of letters that completes a word — selection auto-submits at this length. */
  targetLength: number;
  hintTile: number | null;
  disabled?: boolean;
  onSubmit: (indices: number[]) => void;
  onChange: (indices: number[]) => void;
};

const RADIUS = 36; // % of wheel size

/**
 * Circle of letter tiles. Drag across tiles to build a word (release submits),
 * or tap tiles one by one (auto-submits when the word length is reached).
 */
export function LetterWheel({ letters, targetLength, hintTile, disabled, onSubmit, onChange }: Props) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef({ active: false, moved: false, rect: null as DOMRect | null });

  const positions = letters.map((_, i) => {
    const angle = (i / letters.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + RADIUS * Math.cos(angle), y: 50 + RADIUS * Math.sin(angle) };
  });

  // Mirror of `selected` so rapid pointer events never read a stale selection.
  const selRef = useRef<number[]>([]);

  const update = useCallback(
    (next: number[]) => {
      selRef.current = next;
      setSelected(next);
      onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    update([]);
  }, [letters, update]);

  const finish = useCallback(
    (sel: number[]) => {
      update([]);
      setPointer(null);
      if (sel.length > 0) onSubmit(sel);
    },
    [onSubmit, update],
  );

  function hit(clientX: number, clientY: number) {
    const rect = drag.current.rect;
    if (!rect) return { index: -1, x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    // RTL doesn't affect absolute coordinates; tiles use `left`.
    let index = -1;
    positions.forEach((p, i) => {
      if (Math.hypot(p.x - x, p.y - y) < 11) index = i;
    });
    return { index, x, y };
  }

  function add(sel: number[], index: number) {
    const next = [...sel, index];
    sfx.tap(next.length);
    buzz();
    if (next.length >= targetLength) {
      drag.current.active = false;
      finish(next);
      return null;
    }
    update(next);
    return next;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    drag.current.rect = wheelRef.current!.getBoundingClientRect();
    const { index, x, y } = hit(e.clientX, e.clientY);
    if (index < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current.active = true;
    drag.current.moved = false;
    setPointer({ x, y });
    // Tap on the last selected tile removes it (tap mode undo).
    const sel = selRef.current;
    if (sel.at(-1) === index) {
      update(sel.slice(0, -1));
      drag.current.active = false;
      return;
    }
    if (!sel.includes(index)) add(sel, index);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const { index, x, y } = hit(e.clientX, e.clientY);
    setPointer({ x, y });
    if (index < 0) return;
    const sel = selRef.current;
    if (!sel.includes(index)) {
      drag.current.moved = true;
      add(sel, index);
    } else if (sel.length > 1 && sel.at(-2) === index) {
      update(sel.slice(0, -1)); // drag back to undo
    }
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    setPointer(null);
    // A drag across several tiles submits on release; a single tap keeps building.
    if (drag.current.moved && selRef.current.length > 1) finish(selRef.current);
  }

  const linePoints = selected.map((i) => positions[i]);
  if (pointer && drag.current.active && linePoints.length) linePoints.push(pointer);

  return (
    <div
      ref={wheelRef}
      className="wheel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="عجلة الحروف: اسحب أو اضغط على الحروف بالترتيب"
    >
      <svg viewBox="0 0 100 100" aria-hidden>
        {linePoints.length > 1 && (
          <polyline
            points={linePoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#1f63c6"
            strokeOpacity=".75"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {letters.map((letter, i) => (
        <button
          key={i}
          type="button"
          tabIndex={-1}
          className={`tile${selected.includes(i) ? " is-hot" : ""}${hintTile === i ? " is-hint-tile" : ""}`}
          style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%`, border: 0, pointerEvents: "none" }}
          aria-hidden
        >
          {letter}
        </button>
      ))}
      <button
        type="button"
        className="wheel-center"
        aria-label="مسح الاختيار"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => update([])}
        disabled={disabled}
      >
        <Icon name="replay" size={24} />
      </button>
      {/* Keyboard / screen-reader alternative */}
      <div className="sr-only">
        {letters.map((letter, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || selected.includes(i)}
            onClick={() => add(selRef.current, i)}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
