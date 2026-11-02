import Link from "next/link";
import { Icon } from "./Icon";
import { StarTotal } from "./OfflineProgress";

export const toArabic = (n: number) => n.toLocaleString("ar-EG");
/** Star counters use 0–9: the Arabic-Indic zero «٠» reads as a dot to young players. */
export const starCount = (n: number) => n.toLocaleString("en-US");

/** The khatam (8-point star) medallion — the app's signature shape for stations and badges. */
export function Medal({
  color,
  children,
  size = 72,
  state = "open",
  label,
  progress,
}: {
  color: string;
  children: React.ReactNode;
  size?: number;
  state?: "open" | "current" | "done" | "locked";
  label?: string;
  /** 0–1: draws a progress ring around the medal (e.g. share of the station completed). */
  progress?: number;
}) {
  return (
    <span className={`medal is-${state}`} style={{ "--c": color, "--s": `${size}px` } as React.CSSProperties} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {progress !== undefined && progress > 0 && (
        <svg className="medal-ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="47" pathLength={100} />
          <circle cx="50" cy="50" r="47" pathLength={100} className="medal-ring-fill" style={{ strokeDasharray: `${Math.round(progress * 100)} 100` }} />
        </svg>
      )}
      <span className="medal-face">{state === "locked" ? <Icon name="lock" size={Math.round(size * 0.34)} /> : children}</span>
      {state === "done" && (
        <span className="medal-check">
          <Icon name="check" size={14} />
        </span>
      )}
    </span>
  );
}

/**
 * Slim floating bar for the station and stage maps (they replace the app's top bar there). Maps start at
 * the bottom, so this stays pinned to the top: back, title, an optional «about» popover, and the stars.
 */
export function MapHead({
  back,
  backLabel,
  kicker,
  title,
  stars,
  info,
  infoLabel,
}: {
  back: string;
  backLabel: string;
  kicker: React.ReactNode;
  title: React.ReactNode;
  stars: number;
  info?: React.ReactNode;
  infoLabel?: string;
}) {
  return (
    <header className="map-head">
      <Link href={back} className="mh-back" aria-label={`رجوع إلى ${backLabel}`}>
        <Icon name="forward" size={18} />
      </Link>
      <div className="mh-text">
        <small>{kicker}</small>
        <h1>{title}</h1>
      </div>
      {info && (
        <details className="mh-info">
          <summary aria-label={infoLabel} title={infoLabel}>
            <Icon name="book" size={18} />
          </summary>
          <div className="mh-pop">
            {infoLabel && <b className="mh-pop-title">{infoLabel}</b>}
            {info}
          </div>
        </details>
      )}
      <Link href="/achievements" className="star-pill" aria-label="نجومك">
        <Icon name="star" size={16} filled />
        <StarTotal stars={stars} />
      </Link>
    </header>
  );
}

/** Thin rounded progress bar. */
export function Progress({ value, total, color }: { value: number; total: number; color?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <span className="progress" style={color ? ({ "--c": color } as React.CSSProperties) : undefined} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Stars({ count, size = 18 }: { count: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${count} من ٣ نجوم`}>
      {[1, 2, 3].map((s) => (
        <span key={s} className={s <= count ? "is-on" : ""}>
          <Icon name="star" size={size} filled />
        </span>
      ))}
    </span>
  );
}
