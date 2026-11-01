"use client";
import { useEffect } from "react";

/** On mount, scrolls the element marked `data-focus` to the middle of the screen (e.g. the current level on the map). */
export function ScrollToFocus() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-focus]");
    if (!el) return;
    // Wait one frame so the map has its final height before measuring.
    const id = requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "auto" }));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
