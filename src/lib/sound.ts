"use client";
// Tiny synthesized sound effects (Web Audio) for taps and mistakes, plus short spoken praise in a child's
// voice («ما شاء الله»، «أحسنت»…) for solved words and finished levels. The praise clips live in
// /public/sounds/praise (a few KB each); replace any of them with a real recording under the same name.

let ctx: AudioContext | null = null;

/** Said after each solved word. */
const PRAISE = ["mashallah", "ahsant", "rae3", "mumtaz", "allahuakbar", "barakallah"];
/** Said when a level is finished — a little longer. */
const PRAISE_WIN = ["win1", "win2", "win3"];

const clips = new Map<string, AudioBuffer>();
let loading = false;

/** Decoded once into Web Audio buffers, so they play instantly and even outside a tap (e.g. after a delay on iOS). */
function loadClips() {
  if (loading || !ctx) return;
  loading = true;
  const c = ctx;
  for (const id of [...PRAISE, ...PRAISE_WIN])
    fetch(`/sounds/praise/${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => c.decodeAudioData(b))
      .then((buf) => void clips.set(id, buf))
      .catch(() => {});
}

const lastSaid: Record<string, string> = {};
/** Says a random clip from the pool (never the same one twice in a row); silent if none is loaded yet. */
function say(pool: string[]) {
  if (!ctx) return;
  const ready = pool.filter((id) => clips.has(id) && id !== lastSaid[pool[0]]);
  const id = ready[Math.floor(Math.random() * ready.length)] ?? pool.find((p) => clips.has(p));
  if (!id) return;
  lastSaid[pool[0]] = id;
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = clips.get(id)!;
  g.gain.value = 0.9;
  src.connect(g).connect(ctx.destination);
  src.start();
}
const KEY = "sound";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY, muted ? "off" : "on");
  } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

function play(fn: () => void) {
  if (isMuted() || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    loadClips();
    fn();
  } catch {}
}

export const sfx = {
  tap: (step = 0) => play(() => tone(440 * Math.pow(2, step / 12) * 1.2, 0, 0.12, "triangle", 0.09)),
  // Spoken praise instead of a chime. Clips start loading on the first letter tap, well before a word is solved.
  correct: () => play(() => say(PRAISE)),
  wrong: () => play(() => (tone(220, 0, 0.18, "square", 0.05), tone(180, 0.12, 0.22, "square", 0.05))),
  hint: () => play(() => (tone(880, 0, 0.1, "sine"), tone(1320, 0.08, 0.16, "sine"))),
  win: () => play(() => say(PRAISE_WIN)),
};

export function buzz(ms = 12) {
  try {
    if (!isMuted()) navigator.vibrate?.(ms);
  } catch {}
}
