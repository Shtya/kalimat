"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameData, GameType } from "@/lib/games/types";
import { markDone, submitAttempt } from "@/lib/offline-queue";
import { scoreAttempt } from "@/lib/scoring";
import { preloadSounds, sfx } from "@/lib/sound";
import { Icon } from "@/components/play/Icon";
import { useProgress } from "@/components/play/OfflineProgress";
import { rememberFinished } from "@/components/play/UnlockFx";

/** What a game mode gets from the shell. Modes own their board; the shell owns time, hints, facts and saving. */
export type GameApi = {
  /** Index of the word to play now (used by one-word-at-a-time modes). */
  current: number;
  found: boolean[];
  /** True while a fact card or the result is shown. */
  paused: boolean;
  solve: (wordIndex: number) => void;
  /** A wrong answer; pass the word it was about when known (feeds the per-question report). */
  mistake: (wordIndex?: number) => void;
  /** Modes register their hint behaviour here; return true when a hint was actually given. */
  hintRef: React.MutableRefObject<(() => number | false) | null>;
};
export type ModeProps = { data: GameData; api: GameApi };

// Each mode is its own chunk: a level only downloads the player it uses.
const MODES: Record<GameType, React.ComponentType<ModeProps>> = {
  WORD_BUILD: dynamic(() => import("./modes/WheelMode")),
  WORD_SEARCH: dynamic(() => import("./modes/SearchMode")),
  MATCH: dynamic(() => import("./modes/MatchMode")),
  MISSING_LETTER: dynamic(() => import("./modes/MissingMode")),
};

/** Modes where each solved word pauses on a fact card; MATCH shows facts inline instead. */
const FACT_CARD: Record<GameType, boolean> = { WORD_BUILD: true, WORD_SEARCH: true, MATCH: false, MISSING_LETTER: true };

/** One word at a time (the progress bar highlights the current word). */
const SEQUENTIAL: Record<GameType, boolean> = { WORD_BUILD: true, WORD_SEARCH: false, MATCH: false, MISSING_LETTER: true };
const PRAISE = ["أحسنت!", "رائع!", "ممتاز!", "بارك الله فيك!", "إجابة صحيحة!"];

const MAX_HINTS = 3;
type Phase = "playing" | "fact" | "saving" | "result";
type Result = { stars: number; score: number; nextLevelId: string | null; offline: boolean; error?: string };

/** Arabic-Indic digits, like the rest of the child app. */
const ar = (v: number | string) => String(v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const fmt = (s: number) => ar(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

export function GameShell({ data, preview = false }: { data: GameData; preview?: boolean }) {
  const { meta, words } = data;
  const router = useRouter();
  const { nextAfter, isDone } = useProgress();
  // Finishing a station is celebrated once: not when its last level is replayed.
  const firstTime = useRef(!isDone(meta.id));
  const [found, setFound] = useState<boolean[]>(() => words.map(() => false));
  const [current, setCurrent] = useState(0);
  const [lastSolved, setLastSolved] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [runId, setRunId] = useState(0);
  const attemptId = useRef("");
  const hintRef = useRef<(() => number | false) | null>(null);
  // Per-question mistakes and hints, sent with the result for the knowledge reports.
  const perWord = useRef({ mistakes: words.map(() => 0), hints: words.map(() => 0) });
  const stats = useRef({ hintsUsed: 0, mistakes: 0, seconds: 0 });
  stats.current = { hintsUsed, mistakes, seconds };
  // Feedback: a brief screen flash on every answer, and a streak chip for consecutive first-try words.
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pulse = useCallback((kind: "good" | "bad") => {
    clearTimeout(flashTimer.current);
    setFlash(kind);
    flashTimer.current = setTimeout(() => setFlash(null), 650);
  }, []);
  const streakRef = useRef(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    attemptId.current = crypto.randomUUID();
  }, [runId]);

  // «بسم الله» as the level opens (and on «العب مرة أخرى»). Only when the page already had a tap — opened
  // from the map — since browsers keep sound off until then; a direct load stays quiet instead of warning.
  useEffect(() => {
    preloadSounds();
    if (navigator.userActivation?.hasBeenActive !== false) sfx.start();
  }, [runId]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const finish = useCallback(async () => {
    const s = stats.current;
    if (meta.endsStation && firstTime.current) sfx.station();
    else sfx.win();
    firstTime.current = false;
    const local = scoreAttempt(meta.type, meta.difficulty, {
      wordCount: words.length,
      timeSpent: Math.max(1, s.seconds),
      hintsUsed: s.hintsUsed,
      mistakes: s.mistakes,
    });
    if (preview) {
      setResult({ ...local, nextLevelId: null, offline: false });
      setPhase("result");
      return;
    }
    setPhase("saving");
    const res = await submitAttempt({
      levelId: meta.id,
      clientAttemptId: attemptId.current,
      timeSpent: Math.min(3600, Math.max(1, s.seconds)),
      hintsUsed: s.hintsUsed,
      mistakes: Math.min(500, s.mistakes),
      wordsSolved: words.length,
      items: words.map((w, i) => ({ wordId: w.id, mistakes: Math.min(100, perWord.current.mistakes[i]), hints: Math.min(10, perWord.current.hints[i]) })),
    });
    if (res.status === "sent") {
      const d = res.data as { stars: number; score: number; nextLevelId: string | null };
      markDone(meta.id, d.stars); // unlocks the next level at once, offline copies of the map included
      setResult({ stars: d.stars, score: d.score, nextLevelId: d.nextLevelId, offline: false });
      rememberFinished(meta.id, d.nextLevelId); // the map plays the unlock moment on return
      router.refresh(); // updates the star counter in the header
    } else if (res.status === "queued") {
      // Offline: the result waits on this device; the next level opens now and syncs later.
      markDone(meta.id, local.stars);
      const next = nextAfter(meta.id);
      setResult({ ...local, nextLevelId: next, offline: true });
      rememberFinished(meta.id, next);
    } else {
      setResult({ ...local, nextLevelId: null, offline: false, error: res.error });
    }
    setPhase("result");
  }, [meta, words, preview, router, nextAfter]);

  const solve = useCallback(
    (i: number) => {
      if (found[i]) return;
      const next = found.map((f, k) => f || k === i);
      setFound(next);
      setLastSolved(i);
      sfx.correct();
      pulse("good");
      const clean = perWord.current.mistakes[i] === 0 && perWord.current.hints[i] === 0;
      streakRef.current = clean ? streakRef.current + 1 : 0;
      setStreak(streakRef.current);
      const done = next.every(Boolean);
      if (FACT_CARD[meta.type]) setTimeout(() => setPhase("fact"), 600);
      else if (done) setTimeout(() => void finish(), 900);
    },
    [found, meta.type, finish, pulse],
  );

  const mistake = useCallback(
    (wordIndex?: number) => {
      if (wordIndex !== undefined) perWord.current.mistakes[wordIndex]++;
      sfx.wrong();
      pulse("bad");
      streakRef.current = 0;
      setStreak(0);
      setMistakes((m) => m + 1);
    },
    [pulse],
  );

  function continueAfterFact() {
    if (found.every(Boolean)) return void finish();
    setCurrent(found.findIndex((f) => !f));
    setPhase("playing");
  }

  function hint() {
    if (hintsUsed >= MAX_HINTS || phase !== "playing") return;
    const target = hintRef.current?.();
    if (target !== undefined && target !== false) {
      perWord.current.hints[target]++;
      sfx.hint();
      setHintsUsed((h) => h + 1);
    }
  }

  function replay() {
    perWord.current = { mistakes: words.map(() => 0), hints: words.map(() => 0) };
    streakRef.current = 0;
    setStreak(0);
    setFound(words.map(() => false));
    setCurrent(0);
    setLastSolved(null);
    setHintsUsed(0);
    setMistakes(0);
    setSeconds(0);
    setResult(null);
    setPhase("playing");
    setRunId((r) => r + 1);
  }

  const Mode = MODES[meta.type];
  const api: GameApi = { current, found, paused: phase !== "playing", solve, mistake, hintRef };
  const solvedCount = found.filter(Boolean).length;
  const factWord = lastSolved !== null ? words[lastSolved] : null;

  return (
    <div className={`game${flash ? ` is-flash-${flash}` : ""}`}>
      {preview && <div className="preview-banner">وضع المعاينة — لن يُحفظ أي تقدم</div>}
      <div className="game-hud">
        <Link href={meta.backHref} className="hud-close" aria-label="إغلاق المستوى والعودة إلى الخريطة">
          <Icon name="close" size={22} />
        </Link>
        <div className="segments" role="progressbar" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={solvedCount} aria-label={`حللت ${solvedCount} من ${words.length}`}>
          {words.map((w, i) => (
            <i key={w.id} className={found[i] ? "is-on" : SEQUENTIAL[meta.type] && i === current ? "is-now" : ""} />
          ))}
        </div>
        <span className="hud-pill" aria-label="الوقت">
          <Icon name="timer" size={18} />
          {fmt(seconds)}
        </span>
      </div>

      {streak >= 2 && phase === "playing" && (
        <div className="streak" key={streak} role="status">
          <span aria-hidden>🔥</span> {ar(streak)} إجابات صحيحة متتالية
        </div>
      )}

      <Mode key={runId} data={data} api={api} />

      {!FACT_CARD[meta.type] && factWord && phase === "playing" && (
        <div className="fact-inline" key={factWord.id} aria-live="polite">
          <b>هل تعلم؟</b> {factWord.fact}
          {factWord.source && <small> — {factWord.source}</small>}
        </div>
      )}

      <div className="game-actions">
        <button type="button" className="hint-btn" onClick={hint} disabled={hintsUsed >= MAX_HINTS || phase !== "playing"}>
          <Icon name="bulb" size={22} />
          <span>تلميح</span>
          <b aria-label={`متبقي ${MAX_HINTS - hintsUsed}`}>{ar(MAX_HINTS - hintsUsed)}</b>
        </button>
        <span className="hud-pill is-soft" aria-label={`الأخطاء ${mistakes}`}>
          <Icon name="close" size={16} />
          {ar(mistakes)}
        </span>
      </div>

      {phase === "fact" && factWord && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="fact-title">
          <div className="sheet">
            <span className="sheet-handle" aria-hidden />
            <div className="solved-word" aria-hidden>
              {factWord.letters.map((l, i) => (
                <span key={i} className="tile is-solved" style={{ "--i": i } as React.CSSProperties}>
                  {l}
                </span>
              ))}
            </div>
            <h2 id="fact-title" className="sheet-title">{PRAISE[(lastSolved ?? 0) % PRAISE.length]}</h2>
            {factWord.quranText && <p className="quran-text">{factWord.quranText}</p>}
            <div className="fact-card">
              <span className="fact-card-head">
                <Icon name="book" size={18} /> هل تعلم؟
              </span>
              <p>{factWord.fact}</p>
              {factWord.source && <small className="fact-source">{factWord.source}</small>}
            </div>
            <button className="btn btn-gold btn-block btn-lg" onClick={continueAfterFact} autoFocus>
              {found.every(Boolean) ? "شاهد نتيجتك" : "الكلمة التالية"}
              <Icon name="back" />
            </button>
          </div>
        </div>
      )}

      {phase === "saving" && (
        <div className="overlay is-center" aria-live="polite">
          <div className="state">
            <span className="khatam-spinner" aria-hidden />
            <p className="state-text is-light">نحفظ نجومك…</p>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <>
          <Confetti />
          <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className={`sheet is-result stars-${result.stars}`}>
              {result.stars === 3 && <div className="result-rays" aria-hidden />}
              <div className="result-stars" aria-label={`${result.stars} من ٣ نجوم`}>
                {[1, 2, 3].map((s) => (
                  <span key={s} className={s <= result.stars ? "is-on" : ""} style={{ "--i": s } as React.CSSProperties}>
                    <Icon name="star" size={s === 2 ? 64 : 50} filled />
                  </span>
                ))}
              </div>
              <h2 id="result-title" className="sheet-title">{result.stars === 3 ? "ممتاز! ثلاث نجوم" : result.stars === 2 ? "أحسنت!" : "أكملت المستوى!"}</h2>
              <p className="sheet-sub">{result.stars === 3 ? "حللت كل الكلمات بسرعة وبدون تلميح." : "العب مرة أخرى بدون تلميحات لتجمع ثلاث نجوم."}</p>
              {result.nextLevelId && (
                <p className="unlocked-chip">
                  <Icon name="lock" size={16} /> فتحت مستوى جديدًا!
                </p>
              )}
              <div className="result-stats">
                <span>
                  <b>
                    <CountUp value={result.score} />
                  </b>
                  نقطة
                </span>
                <span>
                  <b>{fmt(seconds)}</b>الوقت
                </span>
                <span>
                  <b>{ar(hintsUsed)}</b>تلميحات
                </span>
              </div>
              <div className="btn-stack">
                {result.nextLevelId ? (
                  <Link href={`/play/${result.nextLevelId}`} className="btn btn-gold btn-block btn-lg">
                    المستوى التالي <Icon name="back" />
                  </Link>
                ) : (
                  <Link href={meta.backHref} className="btn btn-gold btn-block btn-lg">
                    <Icon name="map" /> العودة للخريطة
                  </Link>
                )}
                <div className="btn-pair">
                  <button className="btn btn-ghost" onClick={replay}>
                    <Icon name="replay" /> أعد اللعب
                  </button>
                  {result.nextLevelId && (
                    <Link href={meta.backHref} className="btn btn-ghost">
                      <Icon name="map" /> الخريطة
                    </Link>
                  )}
                </div>
              </div>
              {result.offline && <p className="hint-text center">لا يوجد اتصال الآن. حفظنا نتيجتك على جهازك وسنرسلها عند عودة الإنترنت.</p>}
              {result.error && <p className="hint-text center">لم نتمكن من حفظ هذه النتيجة.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Counts up to the score once, eased (Arabic-Indic digits). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void setShown(value);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{ar(shown)}</>;
}

const COLORS = ["#f6c23b", "#1f63c6", "#2e9e5b", "#d6457e", "#0f9a91", "#7b4bb7"];
function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.6,
      color: COLORS[i % COLORS.length],
    })),
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
    </div>
  );
}
