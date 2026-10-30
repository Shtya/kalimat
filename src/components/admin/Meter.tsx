import type { Mastery } from "@/server/services/reports";

/** Mastery bar: colour shifts red → amber → green with the percentage. */
export function Meter({ m }: { m?: Mastery | null }) {
  if (!m || m.pct === null) return <span className="muted">—</span>;
  const tone = m.pct >= 75 ? "good" : m.pct >= 50 ? "mid" : "low";
  return (
    <span className={`meter meter-${tone}`} title={`${m.correct} من ${m.answered} إجابة صحيحة من أول مرة`}>
      <span className="meter-bar" aria-hidden>
        <i style={{ width: `${m.pct}%` }} />
      </span>
      <b className="num">{m.pct}%</b>
      <small className="muted num">({m.answered})</small>
    </span>
  );
}
