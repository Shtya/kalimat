import Link from "next/link";
import { Icon, type IconName } from "@/components/play/Icon";
import { DrawerKeys } from "./DrawerKeys";

/**
 * Every dashboard page opens the same way: where you are (kicker), what this page is (title),
 * one line on what to do here, and the page's main actions on the other side.
 */
export function PageHead({ kicker, title, children, actions }: { kicker?: React.ReactNode; title: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {kicker && <span className="page-kicker">{kicker}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

/** What an empty list means, and the one thing to do about it. */
export function EmptyState({ icon = "info", title, children, action }: { icon?: IconName; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden>
        <Icon name={icon} size={26} />
      </span>
      <b>{title}</b>
      {children && <p>{children}</p>}
      {action && <div className="empty-actions">{action}</div>}
    </div>
  );
}

/**
 * Side drawer opened by a URL parameter, so it works with links, the back button and a refresh.
 * Server-rendered; `DrawerKeys` adds Escape-to-close and focus.
 */
export function Drawer({ title, kicker, closeHref, children, wide }: { title: string; kicker?: string; closeHref: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="drawer-root">
      <Link href={closeHref} className="drawer-scrim" aria-label="إغلاق" scroll={false} tabIndex={-1} />
      <aside className={`drawer${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div>
            {kicker && <small>{kicker}</small>}
            <h2 id="drawer-title">{title}</h2>
          </div>
          <Link href={closeHref} className="drawer-close" aria-label="إغلاق" scroll={false}>
            <Icon name="close" size={20} />
          </Link>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
      <DrawerKeys closeHref={closeHref} />
    </div>
  );
}

/** Pill-shaped tabs that filter through the URL (no form submit needed). */
export function Segmented({ items, label }: { label: string; items: { href: string; label: React.ReactNode; active: boolean }[] }) {
  return (
    <nav className="seg" aria-label={label}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={i.active ? "is-active" : undefined} aria-current={i.active ? "true" : undefined} scroll={false}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Percentage as a ring, coloured like the mastery meter. */
export function Ring({ pct, size = 96, label }: { pct: number | null; size?: number; label?: string }) {
  const tone = pct === null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "mid" : "low";
  return (
    <span className={`ring ring-${tone}`} style={{ "--s": `${size}px` } as React.CSSProperties} role="img" aria-label={label ?? (pct === null ? "لا توجد بيانات" : `${pct}%`)}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="44" pathLength={100} />
        {pct !== null && <circle cx="50" cy="50" r="44" pathLength={100} className="ring-fill" style={{ strokeDasharray: `${pct} 100` }} />}
      </svg>
      <b>{pct === null ? "—" : `${pct}%`}</b>
    </span>
  );
}
