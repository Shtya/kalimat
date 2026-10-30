"use client";
// Results are queued locally first, then sent; anything that fails because of
// the network stays queued and is re-sent when the device is back online.

const QUEUE_KEY = "pendingProgress";
const ID_KEY = "anonymousId";

export type PendingAttempt = {
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

export function rememberStudent(anonymousId: string) {
  try {
    localStorage.setItem(ID_KEY, anonymousId);
  } catch {}
}
export function storedStudentId(): string | null {
  try {
    return localStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}
export function forgetStudent() {
  try {
    localStorage.removeItem(ID_KEY);
  } catch {}
}

export type SendResult = { status: "sent"; data: unknown } | { status: "queued" } | { status: "rejected"; error: string };

async function send(item: PendingAttempt): Promise<SendResult> {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item),
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
export async function submitAttempt(item: PendingAttempt): Promise<SendResult> {
  write([...read().filter((i) => i.clientAttemptId !== item.clientAttemptId), item]);
  const result = await send(item);
  if (result.status !== "queued") write(read().filter((i) => i.clientAttemptId !== item.clientAttemptId));
  return result;
}

let flushing = false;
/** Re-send everything queued; returns how many were stored on the server. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of read()) {
      const result = await send(item);
      if (result.status === "queued") break; // still offline
      write(read().filter((i) => i.clientAttemptId !== item.clientAttemptId));
      if (result.status === "sent") sent++;
    }
  } finally {
    flushing = false;
  }
  return sent;
}
