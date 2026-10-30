"use client";
// Tiny synthesized sound effects (Web Audio) — no audio files to download.

let ctx: AudioContext | null = null;
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
    fn();
  } catch {}
}

export const sfx = {
  tap: (step = 0) => play(() => tone(440 * Math.pow(2, step / 12) * 1.2, 0, 0.12, "triangle", 0.09)),
  correct: () => play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, "triangle"))),
  wrong: () => play(() => (tone(220, 0, 0.18, "square", 0.05), tone(180, 0.12, 0.22, "square", 0.05))),
  hint: () => play(() => (tone(880, 0, 0.1, "sine"), tone(1320, 0.08, 0.16, "sine"))),
  win: () => play(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.35, "triangle", 0.1))),
};

export function buzz(ms = 12) {
  try {
    if (!isMuted()) navigator.vibrate?.(ms);
  } catch {}
}
