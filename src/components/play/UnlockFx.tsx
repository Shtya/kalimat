"use client";
import { useEffect } from "react";
import { preloadSounds, sfx } from "@/lib/sound";

const KEY = "kq:justFinished";

/** Called by the game when a level is saved: remember what to celebrate on the map. */
export function rememberFinished(levelId: string, nextLevelId: string | null) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ levelId, nextLevelId, at: Date.now() }));
  } catch {}
}

/**
 * On the stage map: plays the "level unlocked" moment once — the finished node glows,
 * then the next node's lock breaks open. Targets nodes by [data-level-id].
 */
export function UnlockFx() {
  useEffect(() => {
    preloadSounds();
    let data: { levelId: string; nextLevelId: string | null; at: number } | null = null;
    try {
      data = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      sessionStorage.removeItem(KEY);
    } catch {}
    if (!data || Date.now() - data.at > 10 * 60_000) return;

    const done = document.querySelector<HTMLElement>(`[data-level-id="${data.levelId}"]`);
    const next = data.nextLevelId ? document.querySelector<HTMLElement>(`[data-level-id="${data.nextLevelId}"]`) : null;
    if (!done) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    done.classList.add("is-just-done");
    if (next) {
      next.classList.add("is-unlocking");
      timers.push(setTimeout(() => sfx.unlock(), 900));
      timers.push(setTimeout(() => next.classList.remove("is-unlocking"), 2400));
    }
    timers.push(setTimeout(() => done.classList.remove("is-just-done"), 2400));
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
}
