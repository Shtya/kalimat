// Turns the generated sounds (ElevenLabs) in public/new-sounds into the app's clips:
//   voice/ — spoken lines (praise, level finished, bismillah, unlock, station)   → public/sounds/voice
//   fx/    — short effects (tap, wrong, hint, unlock-fx)                         → public/sounds/fx
//
//   npx tsx scripts/sounds.ts
//
// Each clip has its silence trimmed (praise must land the moment a word is solved), is brought to one even
// loudness (voices −16 LUFS; effects quieter, by peak, since they're too short to measure in LUFS) and is
// encoded as a small mono MP3 — the whole set is downloaded for offline play. Requires ffmpeg on PATH.
// After replacing sounds, bump VERSION in public/sw.js so installed apps drop the old copies.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

const IN = "public/new-sounds";
/** Must match VOICE / FX in src/lib/sound.ts. */
const VOICE = ["mashallah", "ahsant", "rae3", "mumtaz", "allahuakbar", "barakallah", "win1", "win2", "win3", "bismillah", "unlock", "station"];
const FX: Record<string, number> = { tap: -6, wrong: -6, hint: -6, "unlock-fx": -4 }; // target peak, dBFS

const TRIM =
  "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01,areverse," +
  "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse";

const ffmpeg = (args: string[]) => execFileSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
/** Runs an analysis filter; ffmpeg writes its reports to stderr. */
const stderrOf = (input: string, filter: string) => spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", filter, "-f", "null", "-"], { encoding: "utf8" }).stderr;

function voice(id: string) {
  const input = `${IN}/${id}.mp3`;
  const report = stderrOf(input, `${TRIM},loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json`);
  const m = JSON.parse(report.slice(report.lastIndexOf("{"), report.lastIndexOf("}") + 1));
  const norm = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ffmpeg(["-loglevel", "error", "-y", "-i", input, "-af", `${TRIM},${norm},afade=t=in:d=0.005,aresample=44100`, "-ac", "1", "-c:a", "libmp3lame", "-b:a", "80k", `public/sounds/voice/${id}.mp3`]);
}

function fx(id: string, peak: number) {
  const input = `${IN}/${id}.mp3`;
  const max = Number(/max_volume: (-?[\d.]+) dB/.exec(stderrOf(input, `${TRIM},volumedetect`))?.[1] ?? 0);
  const gain = (peak - max).toFixed(2);
  ffmpeg(["-loglevel", "error", "-y", "-i", input, "-af", `${TRIM},volume=${gain}dB,afade=t=in:d=0.003,aresample=44100`, "-ac", "1", "-c:a", "libmp3lame", "-b:a", "64k", `public/sounds/fx/${id}.mp3`]);
}

mkdirSync("public/sounds/voice", { recursive: true });
mkdirSync("public/sounds/fx", { recursive: true });
const missing = [...VOICE, ...Object.keys(FX)].filter((id) => !existsSync(`${IN}/${id}.mp3`));
if (missing.length) console.warn(`Missing in ${IN} (kept as they are): ${missing.join(", ")}`);
for (const id of VOICE.filter((v) => !missing.includes(v))) {
  voice(id);
  console.log(`voice/${id}.mp3`);
}
for (const [id, peak] of Object.entries(FX).filter(([f]) => !missing.includes(f))) {
  fx(id, peak);
  console.log(`fx/${id}.mp3`);
}
