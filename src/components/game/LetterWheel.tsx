"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Pt = { x: number; y: number };

/**
 * Where the tiles sit, in % of the wheel: evenly on one circle around the exact centre (360° ÷ n, the first
 * tile at the top), and as large as possible without neighbours touching or tiles leaving the wheel.
 * Works for any count; tuned for 3–8.
 */
export function wheelLayout(n: number) {
  const count = Math.max(1, n);
  const radius = count <= 3 ? 30 : count <= 5 ? 33 : 35;
  // distance between neighbouring tile centres
  const chord = count > 1 ? 2 * radius * Math.sin(Math.PI / count) : 100;
  const tile = Math.min(21, chord * 0.74, (50 - radius) * 2 - 4);
  const points: Pt[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
  });
  return { radius, tile, points };
}

/**
 * Circle of letter tiles. Drag across tiles to build a word (release submits),
 * or tap tiles one by one (auto-submits when the word length is reached).
 * The line follows the finger through a ref (no React render per move), so dragging stays smooth.
 */
export function LetterWheel({ letters, targetLength, hintTile, disabled, onSubmit, onChange }: Props) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<SVGLineElement>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const drag = useRef({ active: false, moved: false, rect: null as DOMRect | null, frame: 0, x: 0, y: 0 });
  const { radius, tile, points } = useMemo(() => wheelLayout(letters.length), [letters.length]);

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

  /** The loose end of the line, from the last tile to the finger (drawn outside React). */
  const drawLive = useCallback(() => {
    drag.current.frame = 0;
    const line = liveRef.current;
    const last = selRef.current.at(-1);
    if (!line) return;
    if (!drag.current.active || last === undefined) {
      line.style.visibility = "hidden";
      return;
    }
    line.setAttribute("x1", String(points[last].x));
    line.setAttribute("y1", String(points[last].y));
    line.setAttribute("x2", drag.current.x.toFixed(2));
    line.setAttribute("y2", drag.current.y.toFixed(2));
    line.style.visibility = "visible";
  }, [points]);
  const scheduleLive = useCallback(() => {
    // moves are batched to one draw per frame; letting go hides the loose end at once
    if (!drag.current.active) {
      cancelAnimationFrame(drag.current.frame);
      drawLive();
    } else if (!drag.current.frame) drag.current.frame = requestAnimationFrame(drawLive);
  }, [drawLive]);
  useEffect(() => () => cancelAnimationFrame(drag.current.frame), []);

  const finish = useCallback(
    (sel: number[]) => {
      drag.current.active = false;
      update([]);
      scheduleLive();
      if (sel.length > 0) onSubmit(sel);
    },
    [onSubmit, update, scheduleLive],
  );

  function hit(clientX: number, clientY: number) {
    const rect = drag.current.rect;
    if (!rect) return { index: -1, x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    // RTL doesn't affect absolute coordinates; tiles use `left`.
    let index = -1;
    let best = tile * 0.62; // a little beyond the tile edge, so fast drags don't skip a letter
    points.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < best) {
        best = d;
        index = i;
      }
    });
    return { index, x, y };
  }

  function add(sel: number[], index: number) {
    const next = [...sel, index];
    sfx.tap(next.length);
    buzz(8);
    if (next.length >= targetLength) {
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
    Object.assign(drag.current, { active: true, moved: false, x, y });
    // Tap on the last selected tile removes it (tap mode undo).
    const sel = selRef.current;
    if (sel.at(-1) === index) {
      update(sel.slice(0, -1));
      drag.current.active = false;
      scheduleLive();
      return;
    }
    if (!sel.includes(index)) add(sel, index);
    scheduleLive();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const { index, x, y } = hit(e.clientX, e.clientY);
    drag.current.x = x;
    drag.current.y = y;
    if (index >= 0) {
      const sel = selRef.current;
      if (!sel.includes(index)) {
        drag.current.moved = true;
        add(sel, index);
      } else if (sel.length > 1 && sel.at(-2) === index) {
        update(sel.slice(0, -1)); // drag back to undo
      }
    }
    scheduleLive();
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    scheduleLive();
    // A drag across several tiles submits on release; a single tap keeps building.
    if (drag.current.moved && selRef.current.length > 1) finish(selRef.current);
  }

  const path = selected.map((i, k) => `${k ? "L" : "M"}${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`).join(" ");

  return (
    <div
      ref={wheelRef}
      className="wheel"
      style={{ "--t": tile, "--r": radius } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="عجلة الحروف: اسحب أو اضغط على الحروف بالترتيب"
    >
      <svg viewBox="0 0 100 100" aria-hidden shapeRendering="geometricPrecision">
        <defs>
          <linearGradient id="wheel-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5d93ea" />
            <stop offset="1" stopColor="#1b4da8" />
          </linearGradient>
        </defs>
        {/* the track the tiles sit on */}
        <circle className="wheel-track" cx="50" cy="50" r={radius} />
        {/* soft halo under the line, then the line itself; the loose end follows the finger */}
        <g className="wheel-line" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {selected.length > 1 && <path className="wheel-line-glow" d={path} />}
          <line ref={liveRef} className="wheel-line-live" style={{ visibility: "hidden" }} />
          {selected.length > 1 && <path className="wheel-line-main" d={path} stroke="url(#wheel-line)" />}
        </g>
        {/* a small ripple each time a letter joins the word */}
        {selected.map((i, k) => (
          <circle key={`${k}-${i}`} className="wheel-ripple" cx={points[i].x} cy={points[i].y} r={tile * 0.5} />
        ))}
      </svg>
      {letters.map((letter, i) => (
        <span
          key={i}
          className={`tile${selected.includes(i) ? " is-hot" : ""}${hintTile === i ? " is-hint-tile" : ""}`}
          style={{ left: `${points[i].x}%`, top: `${points[i].y}%` }}
          aria-hidden
        >
          {letter}
        </span>
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
          <button key={i} type="button" disabled={disabled || selected.includes(i)} onClick={() => add(selRef.current, i)}>
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
