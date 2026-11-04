"use client";
import { useEffect, useState } from "react";
import { getVolume, isMuted, setMuted, setVolume, sfx } from "@/lib/sound";
import { Icon } from "./Icon";

/** Round icon button (top bar) or a labelled switch row with a volume slider (settings). */
export function SoundToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [muted, setState] = useState(false);
  useEffect(() => setState(isMuted()), []);
  const toggle = () => {
    setMuted(!muted);
    setState(!muted);
  };

  if (variant === "row")
    return (
      <>
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
        {!muted && <VolumeRow />}
      </>
    );

  return (
    <button type="button" className="icon-btn" aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} aria-pressed={!muted} onClick={toggle}>
      <Icon name={muted ? "soundOff" : "soundOn"} />
    </button>
  );
}

/** Volume for all game sounds; letting go plays a letter tap at the new level. */
function VolumeRow() {
  const [volume, setState] = useState(0.8);
  useEffect(() => setState(getVolume()), []);
  return (
    <label className="volume-row">
      <Icon name="soundOff" size={18} />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        aria-label="مستوى الصوت"
        onChange={(e) => {
          const v = Number(e.target.value);
          setState(v);
          setVolume(v);
        }}
        onPointerUp={() => sfx.tap(3)}
        style={{ "--v": `${volume * 100}%` } as React.CSSProperties}
      />
      <Icon name="soundOn" size={18} />
    </label>
  );
}
