"use client";
// All of the game's sounds are recorded clips (made with ElevenLabs, processed by scripts/sounds.ts):
// spoken lines in /sounds/voice («ما شاء الله»، «أحسنت»…, «بسم الله», level / station finished) and short effects
// in /sounds/fx (letter tap, wrong answer, hint, unlock). They are decoded once into Web Audio buffers so they
// play instantly, overlap freely and can be pitched (the letter taps rise as a word grows).

let ctx: AudioContext | null = null;
/** Everything plays through this, so the volume setting applies to every sound at once. */
let master: GainNode | null = null;

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

type Voice = { src: AudioBufferSourceNode; g: GainNode };

/** Plays one clip; silent if it isn't decoded yet. `dur` cuts it short with a soft fade-out. */
function clip(id: string, { rate = 1, gain = 1, at = 0, dur = 0 } = {}): Voice | null {
  const buf = clips.get(id);
  if (!ctx || !master || !buf) return null;
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const t = ctx.currentTime + at;
  g.gain.setValueAtTime(gain, t);
  if (dur) {
    g.gain.setValueAtTime(gain, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.stop(t + dur + 0.02);
  }
  src.connect(g).connect(master);
  src.start(t);
  return { src, g };
}

/** Fades a playing clip out in a few ms (no click), then stops it. */
function fadeOut(v: Voice | null) {
  if (!v || !ctx) return;
  const t = ctx.currentTime;
  try {
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(v.g.gain.value, t);
    v.g.gain.linearRampToValueAtTime(0.0001, t + 0.025);
    v.src.stop(t + 0.03);
  } catch {}
}

/** Letter taps never pile up: a new tap fades the previous one out. */
let lastTap: Voice | null = null;
function tap(step: number) {
  fadeOut(lastTap);
  // ~35% of the clip's level, and only its first ~150 ms: a soft, short click that climbs as the word grows.
  lastTap = clip("tap", { rate: Math.pow(2, Math.min(step, 12) / 12), gain: 0.28, dur: 0.15 });
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
const VOLUME_KEY = "soundVolume";

/** Volume for every sound, 0–1 (set in «حسابي»). */
export function getVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY) ?? "0.8");
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8;
  } catch {
    return 0.8;
  }
}

export function setVolume(v: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {}
  if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

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
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = getVolume();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    preloadSounds();
    fn();
  } catch {}
}

export const sfx = {
  /** Letter / cell tap; each step raises the pitch a semitone, so building a word climbs. */
  tap: (step = 0) => play(() => tap(step)),
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
