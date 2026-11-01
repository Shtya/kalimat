"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/play/Icon";

type NavLink = { href: string; label: string; icon: IconName };

/** Grouped by the teacher's two jobs: preparing content, and following students. */
const GROUPS: { title: string | null; links: NavLink[] }[] = [
  { title: null, links: [{ href: "/admin", label: "الرئيسية", icon: "grid" }] },
  {
    title: "المحتوى",
    links: [
      { href: "/admin/curriculum", label: "المنهج", icon: "layers" },
      { href: "/admin/levels", label: "المستويات والأسئلة", icon: "book" },
      { href: "/admin/import", label: "رفع أسئلة Excel", icon: "upload" },
    ],
  },
  {
    title: "المتابعة",
    links: [
      { href: "/admin/insights", label: "قياس المعارف", icon: "chart" },
      { href: "/admin/students", label: "الطلاب", icon: "users" },
    ],
  },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="القائمة">
      {GROUPS.map((g) => (
        <div key={g.title ?? "home"} className="adm-nav-group">
          {g.title && <span className="adm-nav-title">{g.title}</span>}
          {g.links.map((l) => {
            const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
                <Icon name={l.icon} size={20} />
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
