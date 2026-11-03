"use client";
// All of the game's sounds are recorded clips (made with ElevenLabs, processed by scripts/sounds.ts):
// spoken lines in /sounds/voice («ما شاء الله»، «أحسنت»…, «بسم الله», level / station finished) and short effects
// in /sounds/fx (letter tap, wrong answer, hint, unlock). They are decoded once into Web Audio buffers so they
// play instantly, overlap freely and can be pitched (the letter taps rise as a word grows).

let ctx: AudioContext | null = null;

/** Said after each solved word. */
const PRAISE = ["mashallah", "ahsant", "rae3", "mumtaz", "allahuakbar", "barakallah"];
/** Said when a level is finished — a little longer. */
const PRAISE_WIN = ["win1", "win2", "win3"];
/** Must match scripts/sounds.ts and the precache list in public/sw.js. */
const VOICE = [...PRAISE, ...PRAISE_WIN, "bismillah", "unlock", "station"];
const FX = ["tap", "wrong", "hint", "unlock-fx"];

const clips = new Map<string, AudioBuffer>();
const waiting = new Map<string, (() => void)[]>();
let loading = false;

/**
 * Downloads and decodes every clip once. Decoding uses an OfflineAudioContext, so this can start as soon as a
 * game or map opens — before the first tap, when a real AudioContext isn't allowed to run yet.
 */
export function preloadSounds() {
  if (loading || typeof window === "undefined" || typeof OfflineAudioContext === "undefined" || isMuted()) return;
  loading = true;
  const decoder = new OfflineAudioContext(1, 1, 44100);
  const load = (id: string, dir: string) =>
    fetch(`/sounds/${dir}/${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => decoder.decodeAudioData(b))
      .then((buf) => {
        clips.set(id, buf);
        waiting.get(id)?.forEach((fn) => fn());
        waiting.delete(id);
      })
      .catch(() => {});
  VOICE.forEach((id) => void load(id, "voice"));
  FX.forEach((id) => void load(id, "fx"));
}

/** Plays one clip; silent if it isn't decoded yet. */
function clip(id: string, { rate = 1, gain = 1, at = 0 } = {}) {
  const buf = clips.get(id);
  if (!ctx || !buf) return;
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  g.gain.value = gain;
  src.connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + at);
}

const lastSaid: Record<string, string> = {};
/** Says a random clip from the pool (never the same one twice in a row). */
function say(pool: string[]) {
  const ready = pool.filter((id) => clips.has(id) && id !== lastSaid[pool[0]]);
  const id = ready[Math.floor(Math.random() * ready.length)] ?? pool.find((p) => clips.has(p));
  if (!id) return;
  lastSaid[pool[0]] = id;
  clip(id, { gain: 0.95 });
}

/**
 * Plays a clip only if it can start within `ms` (it may still be downloading, or the browser may not have
 * allowed sound yet); a greeting that arrives seconds later, mid-game, would be worse than none.
 */
function soon(id: string, ms: number) {
  const until = Date.now() + ms;
  const go = () => {
    if (Date.now() > until || isMuted() || !ctx) return;
    if (ctx.state !== "running") {
      ctx.addEventListener("statechange", go, { once: true });
      return;
    }
    clip(id, { gain: 0.95 });
  };
  if (clips.has(id)) go();
  else waiting.set(id, [...(waiting.get(id) ?? []), go]);
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
  if (!muted) preloadSounds();
}

function play(fn: () => void) {
  if (isMuted() || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    preloadSounds();
    fn();
  } catch {}
}

export const sfx = {
  /** Letter / cell tap; each step raises the pitch a semitone, so building a word climbs. */
  tap: (step = 0) => play(() => clip("tap", { rate: Math.pow(2, Math.min(step, 12) / 12), gain: 0.8 })),
  correct: () => play(() => say(PRAISE)),
  wrong: () => play(() => clip("wrong")),
  hint: () => play(() => clip("hint", { gain: 0.9 })),
  win: () => play(() => say(PRAISE_WIN)),
  /** A station's last level, finished for the first time. */
  station: () => play(() => clip("station", { gain: 0.95 })),
  /** «بسم الله» as a level opens — only if sound is allowed straight away. */
  start: () => play(() => soon("bismillah", 1500)),
  /** On the map: the lock breaks open, then «فُتح مستوى جديد». */
  unlock: () =>
    play(() => {
      clip("unlock-fx");
      clip("unlock", { gain: 0.95, at: 0.55 });
    }),
};

export function buzz(ms = 12) {
  try {
    if (!isMuted()) navigator.vibrate?.(ms);
  } catch {}
}
