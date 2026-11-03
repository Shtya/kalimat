"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/play/Icon";

/** `also`: other paths that belong to this section (a level page is part of the content section). */
type NavLink = { href: string; label: string; icon: IconName; hint?: string; also?: string[] };

/** Grouped by the teacher's two jobs: preparing content, and following students. */
const GROUPS: { title: string | null; links: NavLink[] }[] = [
  { title: null, links: [{ href: "/admin", label: "الرئيسية", icon: "grid" }] },
  {
    title: "المحتوى",
    links: [
      { href: "/admin/content", label: "المنهج والأسئلة", icon: "layers", hint: "المراحل والمستويات واستيراد Excel", also: ["/admin/levels"] },
    ],
  },
  {
    title: "المتابعة",
    links: [
      { href: "/admin/insights", label: "قياس المعارف", icon: "chart", hint: "ماذا يعرف الطلاب وأين يخطئون" },
      { href: "/admin/students", label: "الطلاب", icon: "users", hint: "التقدم والنشاط لكل طالب" },
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
            const active = l.href === "/admin" ? path === "/admin" : [l.href, ...(l.also ?? [])].some((p) => path.startsWith(p));
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} title={l.hint}>
                <Icon name={l.icon} size={20} />
                <span className="adm-nav-text">
                  {l.label}
                  {l.hint && <small>{l.hint}</small>}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
