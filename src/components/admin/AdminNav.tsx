"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "نظرة عامة", icon: "📊" },
  { href: "/admin/curriculum", label: "المنهج", icon: "🧭" },
  { href: "/admin/levels", label: "المستويات والأسئلة", icon: "🧩" },
  { href: "/admin/import", label: "رفع Excel", icon: "📥" },
  { href: "/admin/insights", label: "قياس المعارف", icon: "🎯" },
  { href: "/admin/students", label: "الطلاب", icon: "👧" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="القائمة">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
