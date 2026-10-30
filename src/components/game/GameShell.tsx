"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameData, GameType } from "@/lib/games/types";
import { submitAttempt } from "@/lib/offline-queue";
import { scoreAttempt } from "@/lib/scoring";
import { sfx } from "@/lib/sound";
import { Icon } from "@/components/play/Icon";

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
const ar = (v: number | string) => String(v).replace(/d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const fmt = (s: number) => ar(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

export function GameShell({ data, preview = false }: { data: GameData; preview?: boolean }) {
  const { meta, words } = data;
  const router = useRouter();
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

  useEffect(() => {
    attemptId.current = crypto.randomUUID();
  }, [runId]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const finish = useCallback(async () => {
    const s = stats.current;
    sfx.win();
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
      setResult({ stars: d.stars, score: d.score, nextLevelId: d.nextLevelId, offline: false });
      router.refresh(); // updates the star counter in the header
    } else {
      setResult({ ...local, nextLevelId: null, offline: res.status === "queued", error: res.status === "rejected" ? res.error : undefined });
    }
    setPhase("result");
  }, [meta, words, preview, router]);

  const solve = useCallback(
    (i: number) => {
      if (found[i]) return;
      const next = found.map((f, k) => f || k === i);
      setFound(next);
      setLastSolved(i);
      sfx.correct();
      const done = next.every(Boolean);
      if (FACT_CARD[meta.type]) setTimeout(() => setPhase("fact"), 600);
      else if (done) setTimeout(() => void finish(), 900);
    },
    [found, meta.type, finish],
  );

  const mistake = useCallback((wordIndex?: number) => {
    if (wordIndex !== undefined) perWord.current.mistakes[wordIndex]++;
    sfx.wrong();
    setMistakes((m) => m + 1);
  }, []);

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
    <div className="game">
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
            <div className="sheet is-result">
              <div className="result-stars" aria-label={`${result.stars} من ٣ نجوم`}>
                {[1, 2, 3].map((s) => (
                  <span key={s} className={s <= result.stars ? "is-on" : ""} style={{ "--i": s } as React.CSSProperties}>
                    <Icon name="star" size={s === 2 ? 64 : 50} filled />
                  </span>
                ))}
              </div>
              <h2 id="result-title" className="sheet-title">{result.stars === 3 ? "ممتاز! ثلاث نجوم" : result.stars === 2 ? "أحسنت!" : "أكملت المستوى!"}</h2>
              <p className="sheet-sub">{result.stars === 3 ? "حللت كل الكلمات بسرعة وبدون تلميح." : "العب مرة أخرى بدون تلميحات لتجمع ثلاث نجوم."}</p>
              <div className="result-stats">
                <span>
                  <b>{ar(result.score)}</b>نقطة
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
