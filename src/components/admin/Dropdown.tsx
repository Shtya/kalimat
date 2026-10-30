"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DropdownOption = { value: string; label: string };

type Props = {
  name: string;
  options: DropdownOption[];
  defaultValue?: string;
  placeholder?: string;
};

/**
 * Custom listbox that submits through a hidden input.
 * Kept outside <label> so a click does not toggle twice.
 */
export function Dropdown({ name, options, defaultValue = "", placeholder = "اختر" }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    setValue(defaultValue);
    setOpen(false);
  }, [defaultValue]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      setValue(defaultValue);
      setOpen(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  function choose(next: string) {
    setValue(next);
    setOpen(false);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, options.length - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[active];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="dd" ref={rootRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className={`dd-btn${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={options.length === 0}
        onClick={() => {
          setActive(selectedIndex);
          setOpen((v) => !v);
        }}
      >
        <span className={selected ? undefined : "dd-placeholder"}>{selected?.label ?? placeholder}</span>
        <svg className="dd-chevron" viewBox="0 0 20 20" aria-hidden width="18" height="18">
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && options.length > 0 && (
        <ul ref={listRef} className="dd-menu" id={listId} role="listbox" tabIndex={-1} onKeyDown={onListKey}>
          {options.map((o, i) => (
            <li key={`${o.value}-${o.label}`} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`dd-opt${o.value === value ? " is-selected" : ""}${i === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
              >
                <span>{o.label}</span>
                {o.value === value && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
