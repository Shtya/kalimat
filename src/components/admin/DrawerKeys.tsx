"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Escape closes the drawer; focus moves into it on open and the page behind stops scrolling. */
export function DrawerKeys({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  useEffect(() => {
    const drawer = document.querySelector<HTMLElement>(".drawer");
    const first = drawer?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, button, [href]:not(.drawer-close)");
    (first ?? drawer)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // Don't steal Escape from an open dropdown inside the drawer.
      if (e.key === "Escape" && !document.querySelector(".dd-menu")) router.push(closeHref, { scroll: false });
    };
    document.documentElement.classList.add("drawer-open");
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("drawer-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [closeHref, router]);
  return null;
}
