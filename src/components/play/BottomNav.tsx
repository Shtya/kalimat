"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buzz } from "@/lib/sound";
import { Icon, type IconName } from "./Icon";
import { useProgress } from "./OfflineProgress";

type Item = { href: string; label: string; icon: IconName; match: (path: string) => boolean };

const JOURNEY: Item = { href: "/journey", label: "رحلتي", icon: "home", match: (p) => p === "/journey" || p.startsWith("/stations") || p.startsWith("/stages") };
const ACHIEVEMENTS: Item = { href: "/achievements", label: "إنجازاتي", icon: "trophy", match: (p) => p.startsWith("/achievements") };

/**
 * Floating bottom bar: the two main sections with a raised «العب» button between them that jumps
 * straight to the next level to play. Hidden during a game (it has its own exit) and before sign-up.
 */
export function BottomNav({ playHref }: { playHref: string }) {
  const path = usePathname();
  // Follows levels finished offline too, so «العب» always opens the next one.
  const { currentId } = useProgress();
  if (currentId) playHref = `/play/${currentId}`;
  if (path === "/app" || path.startsWith("/play")) return null;

  const tab = (item: Item) => {
    const active = item.match(path);
    return (
      <Link href={item.href} prefetch className={`bn-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => buzz(8)}>
        <span className="bn-icon">
          <Icon name={item.icon} size={24} />
        </span>
        <span className="bn-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {tab(JOURNEY)}
      <Link href={playHref} prefetch className="bn-play" aria-label="العب المستوى التالي" onClick={() => buzz(12)}>
        <span className="bn-play-btn">
          <Icon name="play" size={30} filled />
        </span>
        <span className="bn-label">العب</span>
      </Link>
      {tab(ACHIEVEMENTS)}
    </nav>
  );
}

/**
 * Hides the top bar inside a game so the board gets the whole screen, and on the station/stage maps,
 * which carry their own floating bar (MapHead) with the title, back button and stars.
 */
export function TopBarGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return path.startsWith("/play") || path.startsWith("/stages") || path.startsWith("/stations") ? null : <>{children}</>;
}

/** Avatar button to «حسابي», highlighted while on that page. */
export function AccountLink({ initial }: { initial: string }) {
  const path = usePathname();
  const active = path.startsWith("/settings");
  return (
    <Link href="/settings" prefetch className={`avatar-btn${active ? " is-active" : ""}`} aria-label="حسابي" aria-current={active ? "page" : undefined}>
      {initial}
    </Link>
  );
}
