"use client";
// Results are queued locally first, then sent; anything that fails because of
// the network stays queued and is re-sent when the device is back online.
//
// Storage: localStorage. The queue holds a few hundred bytes per finished level, is written once per level,
// and must be readable synchronously when the app opens offline, so IndexedDB would add complexity for no gain.
// Each item carries the student it belongs to and a client id the server de-duplicates on, so re-sending is
// always safe (see SyncedAttempt in the schema).

const QUEUE_KEY = "pendingProgress";
const ID_KEY = "anonymousId";

export type PendingAttempt = {
  /** The student (anonymousId) who played it: only sent while that student is the one on this device. */
  owner?: string;
  /** When it was finished (ms), so results synced later keep their real time. */
  playedAt?: number;
  levelId: string;
  clientAttemptId: string;
  timeSpent: number;
  hintsUsed: number;
  mistakes: number;
  wordsSolved: number;
  items?: { wordId: string; mistakes: number; hints: number }[];
};

function read(): PendingAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}
function write(items: PendingAttempt[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {}
}

/** Called with the signed-in student on every page; a different student on this device starts with no local progress. */
export function rememberStudent(anonymousId: string) {
  try {
    const previous = localStorage.getItem(ID_KEY);
    if (previous === anonymousId) return;
    localStorage.setItem(ID_KEY, anonymousId);
    // Levels finished locally belong to the previous student. Their queued results stay (tagged with their
    // owner) and are sent if that student comes back on this device.
    if (previous) writeDone({});
    navigator.storage?.persist?.().catch(() => {});
  } catch {}
}
export function storedStudentId(): string | null {
  try {
    return localStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}
/** The server no longer knows this student (deleted): drop everything kept for them. */
export function forgetStudent() {
  try {
    const id = localStorage.getItem(ID_KEY);
    localStorage.removeItem(ID_KEY);
    write(read().filter((i) => i.owner && i.owner !== id));
    writeDone({});
  } catch {}
}

// ── Levels finished on this device that the server hasn't confirmed yet (levelId → stars) ──
// They unlock the next level right away, offline included. They are kept after the server confirms them too:
// a page opened later from the offline cache may predate that confirmation, and must not lock the level again.
const DONE_KEY = "offlineDone";
const DONE_EVENT = "kq:done";
const NONE: Record<string, number> = {};
let doneRaw: string | null = null;
let doneCache = NONE;

/** Stable snapshot for useSyncExternalStore. */
export function localDone(): Record<string, number> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DONE_KEY);
  } catch {}
  if (raw !== doneRaw) {
    doneRaw = raw;
    try {
      doneCache = raw ? JSON.parse(raw) : NONE;
    } catch {
      doneCache = NONE;
    }
  }
  return doneCache;
}
function writeDone(next: Record<string, number>) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(DONE_EVENT));
}
export function markDone(levelId: string, stars: number) {
  const done = localDone();
  writeDone({ ...done, [levelId]: Math.max(stars, done[levelId] ?? 0) });
}
export function forgetDone(levelIds: string[]) {
  const done = localDone();
  if (!levelIds.some((id) => id in done)) return;
  writeDone(Object.fromEntries(Object.entries(done).filter(([id]) => !levelIds.includes(id))));
}
export function subscribeDone(cb: () => void) {
  window.addEventListener(DONE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => (window.removeEventListener(DONE_EVENT, cb), window.removeEventListener("storage", cb));
}

export type SendResult ={ status: "sent"; data: unknown } | { status: "queued" } | { status: "rejected"; error: string };

async function send(item: PendingAttempt): Promise<SendResult> {
  // The owner only matters on this device.
  const body: Omit<PendingAttempt, "owner"> & { owner?: string } = { ...item };
  delete body.owner;
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { status: "sent", data: await res.json() };
    // 4xx (except rate limit) will never succeed — drop it.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      const body = await res.json().catch(() => ({}));
      return { status: "rejected", error: body.error ?? "rejected" };
    }
    return { status: "queued" };
  } catch {
    return { status: "queued" };
  }
}

/** Save an attempt: queue it, try to send it right away. */
export async function submitAttempt(attempt: PendingAttempt): Promise<SendResult> {
  const item: PendingAttempt = { ...attempt, owner: storedStudentId() ?? undefined, playedAt: attempt.playedAt ?? Date.now() };
  write([...read().filter((i) => i.clientAttemptId !== item.clientAttemptId), item]);
  const result = await send(item);
  if (result.status !== "queued") write(read().filter((i) => i.clientAttemptId !== item.clientAttemptId));
  if (result.status === "rejected") forgetDone([item.levelId]);
  return result;
}

let flushing = false;
/** Re-send everything queued; returns how many were stored on the server. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const me = storedStudentId();
    // Oldest first: each finished level is what unlocks the next one on the server.
    for (const item of read().filter((i) => !i.owner || i.owner === me)) {
      const result = await send(item);
      if (result.status === "queued") break; // still offline
      write(read().filter((i) => i.clientAttemptId !== item.clientAttemptId));
      if (result.status === "sent") sent++;
      else forgetDone([item.levelId]); // the server refused it, so it doesn't count as finished
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Results still waiting to be sent for the current student. */
export function pendingCount(): number {
  const me = storedStudentId();
  return read().filter((i) => !i.owner || i.owner === me).length;
}
