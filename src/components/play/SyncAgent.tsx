"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flushQueue, forgetStudent, rememberStudent, storedStudentId } from "@/lib/offline-queue";

/**
 * Invisible helper mounted on every student page:
 * - registers the service worker (production only),
 * - keeps the anonymous id in localStorage and restores the cookie from it if it was lost,
 * - flushes results that were saved while offline.
 */
export function SyncAgent({ anonymousId }: { anonymousId: string | null }) {
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

  return null;
}
