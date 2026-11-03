"use client";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { localDone, subscribeDone } from "@/lib/offline-queue";

type Server = { order: string[]; done: Set<string> };
const Ctx = createContext<Server | null>(null);
const NONE: Record<string, number> = {};

/**
 * Carries the level order and what the server knows is finished, so screens can combine it with
 * the levels finished on this device (offline) and unlock the next one without a round trip.
 */
export function OfflineProgressProvider({ order, done, children }: { order: string[]; done: string[]; children: React.ReactNode }) {
  const value = useMemo(() => ({ order, done: new Set(done) }), [order, done]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Progress as the child sees it: the server's plus anything finished on this device and not synced yet. */
export function useProgress() {
  const server = useContext(Ctx);
  // On the server (and during hydration) only the server's progress is known.
  const local = useSyncExternalStore(subscribeDone, localDone, () => NONE);
  return useMemo(() => {
    const order = server?.order ?? [];
    const isDone = (id: string) => !!server?.done.has(id) || id in local;
    const index = (id: string) => order.indexOf(id);
    return {
      isDone,
      localStars: (id: string) => local[id] ?? 0,
      /** Open when it's the first level or the one before it is finished (same rule as the server's journey). */
      isUnlocked: (id: string) => isDone(id) || index(id) <= 0 || isDone(order[index(id) - 1]),
      currentId: order.find((id) => !isDone(id)) ?? null,
      nextAfter: (id: string) => (index(id) >= 0 ? (order[index(id) + 1] ?? null) : null),
      /** Stars earned on this device for levels the server doesn't have yet. */
      extraStars: Object.entries(local).reduce((s, [id, n]) => (server?.done.has(id) ? s : s + n), 0),
    };
  }, [server, local]);
}

/** The star total, including stars earned offline. */
export function StarTotal({ stars }: { stars: number }) {
  const { extraStars } = useProgress();
  return <>{(stars + extraStars).toLocaleString("en-US")}</>;
}
