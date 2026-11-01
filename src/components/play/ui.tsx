import Link from "next/link";
import { Icon } from "./Icon";

export const toArabic = (n: number) => n.toLocaleString("ar-EG");

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

/** Screen title with an optional back button (always top-start, same place on every screen). */
export function PageHead({ back, backLabel, title, sub }: { back?: string; backLabel?: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="page-head">
      {back && (
        <Link href={back} className="back-btn" aria-label={backLabel ? `رجوع إلى ${backLabel}` : "رجوع"}>
          <Icon name="forward" size={20} />
        </Link>
      )}
      <div className="page-head-text">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </div>
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
