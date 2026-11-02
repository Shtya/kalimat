"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flushQueue, forgetStudent, rememberStudent, storedStudentId } from "@/lib/offline-queue";

const WARM_KEY = "offlineWarm";
const WARM_EVERY = 30 * 60_000;

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
  try {
    const [last, at] = (localStorage.getItem(WARM_KEY) ?? "").split("@");
    if (!force && last === stamp && Date.now() - Number(at) < WARM_EVERY) return;
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
    const onOnline = () => void flushQueue().then((n) => n > 0 && router.refresh());
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [anonymousId, router]);

  // Keep the offline copy fresh: on load, after each finished level, and when the connection comes back.
  useEffect(() => {
    if (!anonymousId) return;
    const start = () => void warmOffline(progressKey);
    // first install: the worker becomes active a moment after registering
    void navigator.serviceWorker?.ready.then(start);
    const onOnline = () => void warmOffline(progressKey, true);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [anonymousId, progressKey]);

  return null;
}
