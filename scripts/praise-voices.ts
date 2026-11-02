// Turns raw recordings of a child saying the praise phrases into the game's clips (public/sounds/praise).
//
//   1. Put one file per phrase in recordings/praise/ (any format a phone makes: m4a, ogg/opus from WhatsApp,
//      mp3, wav…), named by the phrase id below or by the Arabic phrase itself, e.g. `mashallah.m4a` or
//      `ما شاء الله.m4a`.
//   2. npx tsx scripts/praise-voices.ts
//
// Each clip is cleaned (rumble and hiss removed, silence trimmed), compressed and brought to a loud, even level
// so every phrase lands with the same energy. Requires ffmpeg on PATH.
// The level-finished phrases (win1–3) can be recorded too; any that are missing are built by joining two short ones.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

const IN = "recordings/praise";
const OUT = "public/sounds/praise";

/** Phrase ids used by src/lib/sound.ts, with the Arabic names a recording may be saved under. */
const PHRASES: Record<string, string[]> = {
  mashallah: ["ما شاء الله", "ماشاء الله", "ماشاالله"],
  ahsant: ["أحسنت", "احسنت"],
  rae3: ["رائع", "رايع"],
  mumtaz: ["ممتاز"],
  allahuakbar: ["الله أكبر", "الله اكبر"],
  barakallah: ["بارك الله فيك", "بارك الله فيكي"],
  win1: ["ما شاء الله أحسنت"],
  win2: ["الله أكبر ممتاز"],
  win3: ["رائع بارك الله فيك"],
};
/** How a missing level-finished phrase is assembled from the short ones. */
const WIN_PARTS: Record<string, [string, string]> = {
  win1: ["mashallah", "ahsant"],
  win2: ["allahuakbar", "mumtaz"],
  win3: ["rae3", "barakallah"],
};

const FILTER = [
  "highpass=f=90", // mic rumble, table knocks
  "afftdn=nf=-28", // steady background hiss
  // trim leading and trailing silence
  "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04",
  "areverse",
  "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08",
  "areverse",
  "equalizer=f=3200:t=q:w=1.2:g=3", // a little presence so it cuts through on phone speakers
  "acompressor=threshold=-20dB:ratio=3.5:attack=4:release=80:makeup=2",
  "loudnorm=I=-14:TP=-1:LRA=7",
  "afade=t=in:d=0.01",
].join(",");

const normalize = (s: string) => s.normalize("NFC").replace(/[ً-ْـ!؟?.،,_-]/g, "").replace(/\s+/g, " ").trim();
const lookup = new Map<string, string>();
for (const [id, names] of Object.entries(PHRASES)) for (const n of [id, ...names]) lookup.set(normalize(n).toLowerCase(), id);

const ffmpeg = (args: string[]) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

function main() {
  if (!existsSync(IN)) {
    mkdirSync(IN, { recursive: true });
    console.log(`Created ${IN}/ — put the recordings there and run this again.`);
    return;
  }
  mkdirSync(OUT, { recursive: true });
  const done = new Set<string>();
  const skipped: string[] = [];

  for (const file of readdirSync(IN)) {
    // everything before the first dot, so `ما شاء الله.m4a` and `ma.opus.ogg`-style names both work
    const id = lookup.get(normalize(basename(file).split(".")[0]).toLowerCase());
    if (!id) {
      skipped.push(file);
      continue;
    }
    ffmpeg(["-i", join(IN, file), "-af", FILTER, "-ac", "1", "-ar", "44100", "-b:a", "96k", join(OUT, `${id}.mp3`)]);
    done.add(id);
    console.log(`✓ ${file} → ${id}.mp3`);
  }

  // Level-finished phrases that weren't recorded: join two freshly recorded short ones with a short breath between.
  const tmp = join(tmpdir(), "praise-gap.wav");
  ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "0.12", tmp]);
  for (const [win, [a, b]] of Object.entries(WIN_PARTS)) {
    if (done.has(win) || !done.has(a) || !done.has(b)) continue;
    ffmpeg([
      ...["-i", join(OUT, `${a}.mp3`), "-i", tmp, "-i", join(OUT, `${b}.mp3`)],
      ...["-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]", "-map", "[a]", "-ac", "1", "-b:a", "96k", join(OUT, `${win}.mp3`)],
    ]);
    done.add(win);
    console.log(`✓ ${win}.mp3 (${a} + ${b})`);
  }
  rmSync(tmp, { force: true });

  const missing = Object.keys(PHRASES).filter((id) => !done.has(id));
  if (skipped.length) console.log(`\nNot recognised (rename to a phrase id or the Arabic phrase): ${skipped.join(", ")}`);
  if (missing.length) console.log(`\nStill using the old clip for: ${missing.join(", ")}`);
}

main();
