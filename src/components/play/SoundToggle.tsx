"use client";
import { useEffect, useState } from "react";
import { isMuted, setMuted } from "@/lib/sound";
import { Icon } from "./Icon";

/** Round icon button (top bar) or a labelled switch row (settings). */
export function SoundToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [muted, setState] = useState(false);
  useEffect(() => setState(isMuted()), []);
  const toggle = () => {
    setMuted(!muted);
    setState(!muted);
  };

  if (variant === "row")
    return (
      <button type="button" className="switch-row" role="switch" aria-checked={!muted} onClick={toggle}>
        <span className="switch-row-icon">
          <Icon name={muted ? "soundOff" : "soundOn"} />
        </span>
        <span className="switch-row-text">
          <b>الأصوات</b>
          <small>{muted ? "مكتومة" : "تعمل أثناء اللعب"}</small>
        </span>
        <span className={`switch${muted ? "" : " is-on"}`} aria-hidden>
          <i />
        </span>
      </button>
    );

  return (
    <button type="button" className="icon-btn" aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} aria-pressed={!muted} onClick={toggle}>
      <Icon name={muted ? "soundOff" : "soundOn"} />
    </button>
  );
}
