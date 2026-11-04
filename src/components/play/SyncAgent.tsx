"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flushQueue, forgetStudent, pendingCount, rememberStudent, storedStudentId } from "@/lib/offline-queue";
import { preloadSounds } from "@/lib/sound";

const WARM_KEY = "offlineWarm";
const WARM_EVERY = 30 * 60_000;
/** While results are waiting, try again this often (the `online` event is not reliable on every phone). */
const RETRY_EVERY = 45_000;

/**
 * While online, asks the service worker to download the pages around the student's current level (and
 * what they need), so the game keeps working offline. Skipped when nothing changed in the last 30 minutes.
 */
async function warmOffline(progressKey: number, force = false) {
  if (!navigator.onLine || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const worker = reg?.active;
  if (!worker) return;
  const res = await fetch("/api/offline").catch(() => null);
  if (!res?.ok) return;
  const { urls } = (await res.json()) as { urls: string[] };
  const stamp = `${progressKey}|${urls.length}`;
  // A new service worker version starts with empty caches: download again at once. The current level is
  // only ever saved by this download (the journey is also saved just by opening it, so it can't tell).
  const copy = await caches.match(urls.find((u) => u.startsWith("/play/")) ?? "/journey").catch(() => undefined);
  try {
    const [last, at] = (localStorage.getItem(WARM_KEY) ?? "").split("@");
    if (!force && copy && last === stamp && Date.now() - Number(at) < WARM_EVERY) return;
    localStorage.setItem(WARM_KEY, `${stamp}@${Date.now()}`);
  } catch {}
  worker.postMessage({ type: "warm", urls });
}

/**
 * Invisible helper mounted on every student page:
 * - registers the service worker (production only),
 * - keeps the anonymous id in localStorage and restores the cookie from it if it was lost,
 * - flushes results that were saved while offline, then refreshes the offline copy of the game.
 */
export function SyncAgent({ anonymousId, progressKey }: { anonymousId: string | null; progressKey: number }) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Decode every game sound once the app is idle, so the first tap and the first «أحسنت» are instant.
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1200));
    idle(() => preloadSounds());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (anonymousId) {
        rememberStudent(anonymousId);
      } else {
        const stored = storedStudentId();
        if (!stored) return;
        const res = await fetch("/api/students/restore", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ anonymousId: stored }),
        }).catch(() => null);
        if (res?.status === 404) forgetStudent();
        if (res?.ok && !cancelled) router.refresh();
        return;
      }
      if ((await flushQueue()) > 0 && !cancelled) router.refresh();
    }
    void run();
    const flush = () => {
      if (!anonymousId || !navigator.onLine || pendingCount() === 0) return;
      void flushQueue().then((n) => n > 0 && !cancelled && router.refresh());
    };
    // Back online, back to the app (iOS often skips `online` for a suspended home-screen app), or periodically.
    const onVisible = () => document.visibilityState === "visible" && flush();
    const timer = window.setInterval(flush, RETRY_EVERY);
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", flush);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", flush);
    };
  }, [anonymousId, router]);

  // Keep the offline copy fresh: on load, after each finished level, and when the connection comes back.
  useEffect(() => {
    if (!anonymousId) return;
    const start = () => void warmOffline(progressKey);
    // first install: the worker becomes active a moment after registering
    void navigator.serviceWorker?.ready.then(start);
    const onOnline = () => void warmOffline(progressKey, true);
    // A new worker version activated (and dropped the old caches).
    const onWorker = (e: MessageEvent) => e.data?.type === "activated" && onOnline();
    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onWorker);
    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onWorker);
    };
  }, [anonymousId, progressKey]);

  return null;
}
